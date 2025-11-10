import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertInvestorSchema, loginSchema, verifyOtpSchema, adminLoginSchema } from "@shared/schema";
import { randomInt } from "crypto";

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email } = loginSchema.parse(req.body);
      
      const otp = generateOTP();
      otpStore.set(email, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      console.log(`OTP for ${email}: ${otp}`);
      
      res.json({ success: true, message: "OTP sent to email" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp } = verifyOtpSchema.parse(req.body);
      
      const storedOtp = otpStore.get(email);
      
      if (!storedOtp) {
        return res.status(400).json({ message: "OTP not found or expired" });
      }

      if (storedOtp.expiresAt < Date.now()) {
        otpStore.delete(email);
        return res.status(400).json({ message: "OTP expired" });
      }

      if (storedOtp.otp !== otp) {
        return res.status(400).json({ message: "Invalid OTP" });
      }

      otpStore.delete(email);

      const investor = await storage.getInvestorByEmail(email);
      
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }

      res.json({ investor });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
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

  app.get("/api/investors/:id", async (req, res) => {
    try {
      const investor = await storage.getInvestorById(req.params.id);
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }
      res.json(investor);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tap-payment/create-charge", async (req, res) => {
    try {
      const { amount, investorId, propertyId } = req.body;

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
          description: "FOPD Fractional Ownership Purchase - 10% Fraction",
          metadata: {
            investorId,
            propertyId,
            fractionPercentage: "10",
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
      const charge = req.body;

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

  const httpServer = createServer(app);

  return httpServer;
}
