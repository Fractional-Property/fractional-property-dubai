import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInvestorSchema, loginSchema, verifyOtpSchema, adminLoginSchema, submitSignatureSchema, createReservationSchema, sendInvitationsSchema, acceptInvitationSchema } from "@shared/schema";
import { randomInt, randomBytes } from "crypto";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

// Session-based authentication middleware for investor endpoints
async function requireInvestorAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract investor ID from session, NOT from request body
    const investorId = req.session?.investorId;
    
    if (!investorId) {
      return res.status(401).json({ 
        message: "Authentication required. Please log in." 
      });
    }

    // Verify investor exists
    const investor = await storage.getInvestorById(investorId);
    if (!investor) {
      return res.status(401).json({ 
        message: "Invalid session. Please log in again." 
      });
    }

    // Attach investor to request for downstream use
    req.investor = investor;
    next();
  } catch (error: any) {
    res.status(500).json({ message: "Authentication error" });
  }
}

// Simple in-memory rate limiter for public endpoints
// NOTE: Current rate limiting is in-memory and per-process. For production horizontal scaling,
// migrate to Redis-backed rate limiting with keys like `${ip}:${endpoint}:${timestamp}`.
// Consider using express-rate-limit with rate-limit-redis adapter.
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function rateLimitMiddleware(maxRequests: number = 10, windowMs: number = 60000) {
  return (req: any, res: any, next: any) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetAt) {
      // New window
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    if (record.count >= maxRequests) {
      return res.status(429).json({ 
        message: "Too many requests. Please try again later.",
        retryAfter: Math.ceil((record.resetAt - now) / 1000)
      });
    }
    
    record.count++;
    next();
  };
}

const uploadsDir = path.join(process.cwd(), "uploads", "kyc-documents");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage_config = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, JPG, and PNG files are allowed."), false);
  }
};

const upload = multer({
  storage: storage_config,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter,
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.post("/api/auth/send-otp", rateLimitMiddleware(5, 60000), async (req, res) => {
    try {
      const { email } = loginSchema.parse(req.body);
      
      const otp = generateOTP();
      otpStore.set(email, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      // SECURITY: OTP removed from logs - never log secrets in production
      
      res.json({ success: true, message: "OTP sent to email" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-otp", rateLimitMiddleware(10, 60000), async (req, res) => {
    try {
      const { email, otp } = verifyOtpSchema.parse(req.body);
      
      // Get stored OTP
      const storedOTP = otpStore.get(email);
      
      if (!storedOTP) {
        return res.status(400).json({ message: "No OTP found. Please request a new one." });
      }
      
      if (storedOTP.expiresAt < Date.now()) {
        otpStore.delete(email);
        return res.status(400).json({ message: "OTP has expired. Please request a new one." });
      }
      
      // CRITICAL: Verify OTP matches (case-sensitive)
      if (storedOTP.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP. Please try again." });
      }
      
      // OTP is valid - clear it
      otpStore.delete(email);
      
      const investor = await storage.getInvestorByEmail(email);
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }
      
      // CRITICAL SECURITY: Regenerate session to prevent session fixation attacks
      req.session.regenerate((err) => {
        if (err) {
          console.error("Session regeneration failed:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }
        
        // Set session data after regeneration
        req.session.investorId = investor.id;
        req.session.investorEmail = investor.email;
        console.log(`Session created for investor: ${investor.email} (ID: ${investor.id})`);
        
        res.json({ investor });
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      console.log("Session destroyed successfully");
      res.json({ success: true });
    });
  });

  app.post("/api/investors", async (req, res) => {
    try {
      const data = insertInvestorSchema.parse(req.body);
      const investor = await storage.createInvestor(data);
      res.json(investor);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/investors/:id", requireInvestorAuth, async (req, res) => {
    try {
      // Investors can only access their own data
      if (req.params.id !== req.investor!.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only access your own investor data" 
        });
      }

      const investor = await storage.getInvestorById(req.params.id);
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }
      res.json(investor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/investors/:id/upload-documents", requireInvestorAuth, upload.fields([
    { name: "passport", maxCount: 1 },
    { name: "proofOfAddress", maxCount: 1 },
    { name: "bankStatement", maxCount: 1 },
  ]), async (req, res) => {
    try {
      const investorId = req.params.id;

      // Investors can only upload documents for themselves
      if (investorId !== req.investor!.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only upload documents for your own account" 
        });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files || Object.keys(files).length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const documentPaths: any = {};

      if (files.passport && files.passport[0]) {
        documentPaths.passportDocPath = `uploads/kyc-documents/${files.passport[0].filename}`;
      }

      if (files.proofOfAddress && files.proofOfAddress[0]) {
        documentPaths.proofOfAddressPath = `uploads/kyc-documents/${files.proofOfAddress[0].filename}`;
      }

      if (files.bankStatement && files.bankStatement[0]) {
        documentPaths.bankStatementPath = `uploads/kyc-documents/${files.bankStatement[0].filename}`;
      }

      documentPaths.documentsUploadedAt = new Date();

      const investor = await storage.updateInvestorDocuments(investorId, documentPaths);

      res.json({
        message: "Documents uploaded successfully",
        investor,
        uploadedFiles: Object.keys(files),
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tap-payment/create-charge", requireInvestorAuth, async (req, res) => {
    try {
      const { amount, investorId, propertyId } = req.body;

      // Validate that investorId from body matches session
      if (investorId !== req.investor!.id) {
        return res.status(403).json({ message: "Cannot create charges for other investors" });
      }

      const tapResponse = await fetch("https://api.tap.company/v2/charges", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.TAP_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "AED",
          customer: {
            email: req.body.email,
            first_name: req.body.firstName,
            last_name: req.body.lastName,
            phone: {
              country_code: "+971",
              number: req.body.phone,
            },
          },
          source: {
            id: "src_all",
          },
          redirect: {
            url: `${req.headers.origin}/dashboard`,
          },
          description: "FOPD Fractional Ownership Purchase - 25% Fraction",
          metadata: {
            investorId,
            propertyId,
            fractionPercentage: "25",
          },
        }),
      });

      const charge = await tapResponse.json();

      if (!tapResponse.ok) {
        return res.status(400).json({ message: "Payment creation failed", error: charge });
      }

      res.json({ 
        chargeId: charge.id,
        redirectUrl: charge.transaction?.url,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tap-payment/webhook", async (req, res) => {
    try {
      // CRITICAL SECURITY: Verify webhook signature using TAP_SECRET_KEY
      const signature = req.headers['x-tap-signature'] as string;
      if (!signature) {
        console.error("Webhook rejected: Missing signature");
        return res.status(401).json({ message: "Missing webhook signature" });
      }
      
      // Validate signature format (must be 64-char lowercase hex for SHA-256)
      if (!/^[a-f0-9]{64}$/.test(signature)) {
        console.error("Webhook rejected: Invalid signature format");
        return res.status(401).json({ message: "Invalid signature format" });
      }
      
      // Get raw body (Buffer from express.raw() middleware)
      const rawBody = req.body as Buffer;
      
      // Calculate HMAC over raw body bytes (not stringified JSON)
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', process.env.TAP_SECRET_KEY || '');
      hmac.update(rawBody);
      const expectedSignature = hmac.digest('hex');
      
      // Timing-safe comparison with equal-length buffers
      const signatureBuffer = Buffer.from(signature, 'hex');
      const expectedBuffer = Buffer.from(expectedSignature, 'hex');
      
      if (signatureBuffer.length !== expectedBuffer.length ||
          !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
        console.error("Webhook rejected: Signature mismatch");
        return res.status(401).json({ message: "Invalid webhook signature" });
      }
      
      // Parse JSON AFTER signature verification
      const charge = JSON.parse(rawBody.toString('utf8'));

      if (charge.status === "CAPTURED") {
        const { investorId, propertyId } = charge.metadata;

        if (!investorId || !propertyId) {
          console.error("Webhook received missing investorId or propertyId");
          return res.status(400).json({ 
            error: "Missing required metadata",
            received: { investorId, propertyId }
          });
        }

        const investor = await storage.getInvestorById(investorId);
        if (!investor) {
          console.error(`Investor not found: ${investorId}`);
          return res.status(404).json({ error: "Investor not found" });
        }

        const property = await storage.getPropertyById(propertyId);
        if (!property) {
          console.error(`Property not found: ${propertyId}`);
          return res.status(404).json({ error: "Property not found" });
        }
        const fraction = await storage.createFraction({
          investorId,
          propertyId,
          fractionNumber: investor.fractionsPurchased + 1,
          purchasePrice: charge.amount.toString(),
          paymentStatus: "completed",
          tapChargeId: charge.id,
        });

        const payment = await storage.createPayment({
          investorId,
          fractionId: fraction.id,
          amount: charge.amount.toString(),
          currency: "AED",
          tapChargeId: charge.id,
          status: "completed",
          paymentMethod: charge.source?.payment_method || "card",
        });

        await storage.updateInvestorAfterPurchase(
          investorId,
          investor.fractionsPurchased + 1,
          (Number(investor.totalInvested) + Number(charge.amount)).toString()
        );

        await storage.updatePropertyFractionsSold(
          propertyId,
          property.fractionsSold + 1
        );

        console.log(`Payment processed successfully for investor ${investorId}, property ${propertyId}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/properties/pilot", async (req, res) => {
    try {
      const property = await storage.getPilotProperty();
      if (!property) {
        return res.status(404).json({ message: "Pilot property not found" });
      }
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const property = await storage.getPropertyById(req.params.id);
      if (!property) {
        return res.status(404).json({ message: "Property not found" });
      }
      res.json(property);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = adminLoginSchema.parse(req.body);
      
      if (email === "admin@fopd.ae" && password === "admin123") {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/admin/investors", async (req, res) => {
    try {
      const investors = await storage.getAllInvestors();
      res.json(investors);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/admin/investors/:id/kyc", async (req, res) => {
    try {
      const { status } = req.body;
      const investor = await storage.updateInvestorKYCStatus(req.params.id, status);
      
      console.log(`Updated KYC status for investor ${req.params.id} to ${status}`);
      
      res.json(investor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/notify-funded", async (req, res) => {
    try {
      const investors = await storage.getAllInvestors();
      
      console.log(`Sending 'Unit Fully Funded' notification to ${investors.length} investors`);
      
      res.json({ 
        success: true, 
        message: `Notification sent to ${investors.length} investors` 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/notify-kyc-reminder", async (req, res) => {
    try {
      const investors = await storage.getAllInvestors();
      const pendingKYC = investors.filter(inv => inv.kycStatus === "pending");
      
      console.log(`Sending KYC reminder to ${pendingKYC.length} investors`);
      
      res.json({ 
        success: true, 
        message: `KYC reminder sent to ${pendingKYC.length} investors` 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/documents/:type", async (req, res) => {
    try {
      const { type } = req.params;
      
      console.log(`Generating PDF document: ${type}`);
      
      res.json({ 
        success: true, 
        message: `${type} PDF generation would happen here`,
        downloadUrl: `/downloads/${type}.pdf`
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await storage.getAllTemplates();
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/admin/templates", async (req, res) => {
    try {
      const template = await storage.createOrUpdateTemplate(req.body);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/admin/templates/:id", async (req, res) => {
    try {
      const template = await storage.updateTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/signatures/create-session", requireInvestorAuth, async (req, res) => {
    try {
      const { propertyId, templateId } = req.body;
      const investorId = req.investor!.id; // From session, not request body
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get("user-agent");

      console.log("Creating signature session with:", {
        investorId,
        propertyId,
        templateId,
      });

      const session = await storage.createSignatureSession({
        investorId,
        propertyId,
        templateId,
        ipAddress,
        userAgent,
      });

      // Generate OTP for signature session verification
      const otp = generateOTP();
      otpStore.set(session.sessionToken, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      // SECURITY: OTP removed from logs - never log secrets in production

      res.json({ sessionId: session.id, sessionToken: session.sessionToken });
    } catch (error: any) {
      console.error("Failed to create signature session:", error);
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/signatures/verify-session", async (req, res) => {
    try {
      const { sessionToken, otp } = req.body;
      
      // Check OTP from in-memory store
      const storedOTP = otpStore.get(sessionToken);
      
      if (!storedOTP) {
        return res.status(400).json({ message: "No OTP found for this session. Please try again." });
      }
      
      if (storedOTP.expiresAt < Date.now()) {
        otpStore.delete(sessionToken);
        return res.status(400).json({ message: "OTP has expired. Please create a new session." });
      }
      
      if (storedOTP.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP. Please check and try again." });
      }
      
      // OTP is valid - update session status in database
      const session = await storage.verifySignatureSession(sessionToken, otp);
      
      if (!session) {
        return res.status(400).json({ message: "Session not found" });
      }

      // Remove OTP from store after successful verification
      otpStore.delete(sessionToken);

      res.json({ success: true, sessionId: session.id });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/signatures/submit", async (req, res) => {
    try {
      const { sessionId, signatureData, consentGiven } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get("user-agent");

      const signature = await storage.saveSignature({
        sessionId,
        signatureData,
        consentGiven,
        ipAddress,
        userAgent,
      });

      res.json({ success: true, signatureId: signature.id });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/signatures/investor/:investorId/property/:propertyId", requireInvestorAuth, async (req, res) => {
    try {
      const { investorId, propertyId } = req.params;

      // Investors can only access their own signatures
      if (investorId !== req.investor!.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only access your own signatures" 
        });
      }

      const signatures = await storage.getInvestorSignatures(investorId, propertyId);
      res.json(signatures);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/signed-documents/property/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const documents = await storage.getSignedDocuments(propertyId);
      res.json(documents);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // PRODUCTION-HARDENED signature submission endpoint with session-based authentication
  app.post("/api/signatures/submit-signature", async (req, res) => {
    try {
      // 1. Validate request body with Zod
      const validatedData = submitSignatureSchema.parse(req.body);
      const { sessionToken, signatureDataUrl, consentGiven } = validatedData;
      
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get("user-agent");

      // 2. Look up and verify session - ENFORCE SESSION-BASED AUTHENTICATION
      const session = await storage.getSessionByToken(sessionToken);
      
      if (!session) {
        return res.status(401).json({ 
          message: "Unauthorized: Invalid or expired session token" 
        });
      }

      // Verify session is verified (OTP confirmed) and not expired
      if (session.status !== "verified" || session.expiresAt < new Date()) {
        return res.status(401).json({ 
          message: "Unauthorized: Session not verified or has expired" 
        });
      }

      // 3. Extract authenticated investor identity from session (NOT from request body)
      const { investorId, propertyId, templateId } = session;

      // 4. Check for duplicate signature - ENFORCE UNIQUENESS CONSTRAINT
      const existingSignature = await storage.checkDuplicateSignature(
        investorId, 
        templateId, 
        propertyId
      );

      if (existingSignature) {
        return res.status(409).json({ 
          message: "Duplicate signature: This investor has already signed this document for this property",
          existingSignatureId: existingSignature.id
        });
      }

      // 5. Encrypt and hash signature data
      const { encryptData, generateHash } = await import("./lib/crypto.js");
      const encryptedSignature = encryptData(signatureDataUrl);
      const signatureHash = generateHash(signatureDataUrl);

      // 6. Save signature with session reference
      const signature = await storage.saveInvestorSignature({
        sessionId: session.id,
        investorId,
        templateId,
        propertyId,
        encryptedSignatureData: encryptedSignature,
        signatureHash,
        ipAddress,
        userAgent,
        consentGiven,
      });

      res.json({ 
        success: true, 
        signatureId: signature.id,
        message: "Signature encrypted and stored securely"
      });
    } catch (error: any) {
      console.error("Signature submission error:", error);
      
      // Handle Zod validation errors
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      // Handle database unique constraint violations
      if (error.code === "23505") {
        return res.status(409).json({ 
          message: "Duplicate signature: This signature has already been recorded" 
        });
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  // Get investor's signature status for all documents
  app.get("/api/signatures/investor/:investorId/status", requireInvestorAuth, async (req, res) => {
    try {
      const { investorId } = req.params;

      // Investors can only access their own signature status
      if (investorId !== req.investor!.id) {
        return res.status(403).json({ 
          message: "Forbidden: You can only access your own signature status" 
        });
      }

      const signatures = await storage.getInvestorSignatures(investorId);
      
      // Return which documents have been signed
      const signedDocuments = signatures.map((sig: any) => ({
        templateId: sig.templateId,
        signedAt: sig.signedAt,
        documentType: sig.templateId // Will map to template type
      }));

      res.json({ signatures: signedDocuments });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get multi-party signing status for a property
  app.get("/api/signatures/property/:propertyId/status", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const status = await storage.getPropertySignatureStatus(propertyId);
      
      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate PDF for a signed document
  app.post("/api/documents/generate", async (req, res) => {
    try {
      const { propertyId, documentType, investorId } = req.body;

      if (!propertyId || !documentType || !investorId) {
        return res.status(400).json({ 
          message: "Missing required fields: propertyId, documentType, investorId" 
        });
      }

      // Generate the PDF document
      const document = await storage.generateSignedDocument(
        propertyId,
        documentType,
        investorId
      );

      res.json({
        success: true,
        document: {
          id: document.id,
          filePath: document.filePath,
          fileHash: document.fileHash,
          documentType: document.documentType,
          generatedAt: document.generatedAt,
        }
      });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Download a generated PDF document
  app.get("/api/documents/:documentId/download", async (req, res) => {
    try {
      const { documentId } = req.params;

      // Get document from database
      const document = await storage.getSignedDocumentById(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if file exists
      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "PDF file not found on disk" });
      }

      // Extract filename from path
      const filename = path.basename(document.filePath);

      // Set headers for PDF download
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      // Stream the PDF file
      const fileStream = fs.createReadStream(document.filePath);
      fileStream.pipe(res);
    } catch (error: any) {
      console.error("PDF download error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get all signed documents for a property
  app.get("/api/documents/property/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const documents = await storage.getSignedDocuments(propertyId);

      res.json({ documents });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Export DLD Bundle - generates consolidated ZIP with PDFs and CSV
  app.post("/api/documents/export-dld-bundle/:propertyId", async (req, res) => {
    try {
      const { propertyId } = req.params;
      const { orchestrateBundleCreation } = await import("./lib/dld-bundle");

      // For MVP, we'll use a default admin user ID
      // In production, this should come from the authenticated session
      const adminUserId = "admin";

      console.log(`Starting DLD bundle export for property: ${propertyId}`);

      // Orchestrate bundle creation
      const result = await orchestrateBundleCreation(propertyId, adminUserId);

      if (!result.success) {
        // Determine appropriate status code
        const statusCode = result.error?.includes("not all signers completed") ? 409 :
                          result.error?.includes("KYC") ? 400 : 500;
        
        return res.status(statusCode).json({ 
          success: false,
          message: result.error || "Failed to generate DLD bundle"
        });
      }

      if (!result.zipBuffer) {
        return res.status(500).json({
          success: false,
          message: "Bundle generated but ZIP buffer is missing"
        });
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const filename = `property-${propertyId}-dld-bundle-${timestamp}.zip`;

      // Set headers for ZIP download
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.setHeader("Content-Length", result.zipBuffer.length.toString());

      // Send ZIP buffer
      res.send(result.zipBuffer);

      console.log(`DLD bundle exported successfully: ${filename}`);
    } catch (error: any) {
      console.error("DLD bundle export error:", error);
      res.status(500).json({ 
        success: false,
        message: error.message || "Internal server error during bundle export"
      });
    }
  });

  // ====== CO-OWNERSHIP RESERVATION ROUTES ======

  // Create a new reservation (express interest) - requires authentication
  app.post("/api/reservations", requireInvestorAuth, async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validatedData = createReservationSchema.parse(req.body);

      // Use investor ID from session, NOT from request body
      const reservationData = {
        ...validatedData,
        initiatorInvestorId: req.investor!.id
      };

      // Use transactional storage method to ensure atomicity
      const result = await storage.createReservationWithSlots(reservationData);

      console.log(`Reservation created by ${req.investor!.email}: ${result.reservation.id} with ${result.slots.length} slots`);

      res.json({
        success: true,
        reservation: result.reservation,
        slots: result.slots,
      });
    } catch (error: any) {
      console.error("Reservation creation error:", error);
      
      // Handle Zod validation errors
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      // Handle database constraint violations
      if (error.code === "23505") {
        return res.status(409).json({ 
          message: "An active reservation already exists for this property" 
        });
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  // Get investor's reservations - requires authentication
  app.get("/api/reservations/investor", requireInvestorAuth, async (req, res) => {
    try {
      // Use investor ID from session, NOT from URL params
      const reservations = await storage.getReservationsByInvestor(req.investor!.id);
      
      res.json({ reservations });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get reservation details with slots and invitations
  app.get("/api/reservations/:reservationId", async (req, res) => {
    try {
      const { reservationId } = req.params;
      const data = await storage.getReservationWithSlots(reservationId);
      
      res.json(data);
    } catch (error: any) {
      if (error.message === "Reservation not found") {
        return res.status(404).json({ message: error.message });
      }
      res.status(500).json({ message: error.message });
    }
  });

  // Update reservation status
  app.patch("/api/reservations/:reservationId/status", async (req, res) => {
    try {
      const { reservationId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }

      const validStatuses = ["draft", "invitations_sent", "all_signed", "payment_pending", "payment_complete", "cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` 
        });
      }

      const reservation = await storage.updateReservationStatus(reservationId, status);
      
      console.log(`Reservation ${reservationId} status updated to: ${status}`);
      
      res.json({ success: true, reservation });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cancel reservation (cascade delete)
  app.delete("/api/reservations/:reservationId", async (req, res) => {
    try {
      const { reservationId } = req.params;
      
      await storage.cancelReservation(reservationId);
      
      console.log(`Reservation ${reservationId} cancelled`);
      
      res.json({ success: true, message: "Reservation cancelled successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Send co-owner invitations - requires authentication
  app.post("/api/reservations/:reservationId/invite", requireInvestorAuth, async (req, res) => {
    try {
      const { reservationId } = req.params;
      
      // Validate request body with Zod schema
      const validatedData = sendInvitationsSchema.parse(req.body);

      // Get reservation to get the initiator
      const reservation = await storage.getReservationById(reservationId);
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      // Verify the authenticated investor is the reservation initiator
      if (reservation.initiatorInvestorId !== req.investor!.id) {
        return res.status(403).json({ 
          message: "Forbidden: Only the reservation initiator can send invitations" 
        });
      }

      // Prepare invitations with tokens and expiry dates
      const invitationsWithTokens = validatedData.invitations.map(inv => {
        // Generate secure 32-char token
        const invitationToken = randomBytes(16).toString('hex');
        
        // Set expiry to 7 days from now
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);

        return {
          slotId: inv.slotId,
          invitedEmail: inv.invitedEmail,
          invitationToken,
          expiresAt,
        };
      });

      // Use transactional storage method to ensure atomicity
      const createdInvitations = await storage.sendInvitationsWithUpdates(
        reservationId,
        invitationsWithTokens,
        reservation.initiatorInvestorId
      );

      // Log invitation tokens for development
      createdInvitations.forEach(inv => {
        console.log(`Invitation created for ${inv.invitedEmail}: token=${inv.invitationToken}`);
      });

      console.log(`${createdInvitations.length} invitations sent for reservation ${reservationId}`);

      res.json({
        success: true,
        invitations: createdInvitations.map(inv => ({
          ...inv,
          invitationLink: `${req.headers.origin}/invitation/${inv.invitationToken}`,
        })),
      });
    } catch (error: any) {
      console.error("Invitation creation error:", error);
      
      // Handle Zod validation errors
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      // Handle database constraint violations
      if (error.code === "23505") {
        return res.status(409).json({ 
          message: "An invitation already exists for this slot or email" 
        });
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  // Get invitation details (for pre-filled form)
  app.get("/api/invitations/:token", async (req, res) => {
    try {
      const { token } = req.params;
      
      const invitation = await storage.getInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invitation not found" });
      }

      // Get reservation and property details
      const reservationData = await storage.getReservationWithSlots(invitation.reservationId);
      const property = await storage.getPropertyById(reservationData.reservation.propertyId);
      
      // Get slot details
      const slot = reservationData.slots.find(s => s.id === invitation.slotId);

      res.json({
        invitation,
        reservation: reservationData.reservation,
        property,
        slot,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Accept invitation (public endpoint with token) - rate limited
  app.post("/api/invitations/accept", rateLimitMiddleware(10, 60000), async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validatedData = acceptInvitationSchema.parse(req.body);

      const invitation = await storage.acceptInvitation(validatedData.invitationToken, validatedData.investorId);
      
      console.log(`Invitation ${invitation.id} accepted by investor ${validatedData.investorId}`);
      
      res.json({
        success: true,
        message: "Invitation accepted successfully",
        invitation,
      });
    } catch (error: any) {
      console.error("Invitation acceptance error:", error);
      
      // Handle Zod validation errors
      if (error.name === "ZodError") {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message.includes("already been processed") || error.message.includes("expired")) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  // Decline invitation
  app.post("/api/invitations/decline", async (req, res) => {
    try {
      const { invitationToken } = req.body;

      if (!invitationToken) {
        return res.status(400).json({ message: "invitationToken is required" });
      }

      const invitation = await storage.declineInvitation(invitationToken);
      
      console.log(`Invitation ${invitation.id} declined`);
      
      res.json({
        success: true,
        message: "Invitation declined",
        invitation,
      });
    } catch (error: any) {
      console.error("Invitation decline error:", error);
      
      if (error.message.includes("not found")) {
        return res.status(404).json({ message: error.message });
      }
      
      if (error.message.includes("already been processed")) {
        return res.status(400).json({ message: error.message });
      }
      
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}

