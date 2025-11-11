import { db } from "../db";
import { 
  investors, fractions, properties, payments, adminUsers,
  agreementTemplates, signatureSessions, investorSignatures, signedDocuments, signatureAuditLog, dldExports,
  propertyReservations, coOwnerSlots, coOwnerInvitations
} from "@shared/schema";
import type { 
  Investor, InsertInvestor, Fraction, InsertFraction, Property, InsertProperty, 
  Payment, InsertPayment, AdminUser, AgreementTemplate, InsertAgreementTemplate,
  SignatureSession, InvestorSignature, SignedDocument,
  PropertyReservation, InsertPropertyReservation, CoOwnerSlot, InsertCoOwnerSlot,
  CoOwnerInvitation, InsertCoOwnerInvitation
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { encryptData, decryptData, generateHash, generateSecureToken, getServerTimestamp } from "./lib/crypto";
import { generateSignedPDF, generateDocumentFilename } from "./lib/pdf-generator";
import { promises as fs } from "fs";
import path from "path";

export interface IStorage {
  createInvestor(investor: InsertInvestor): Promise<Investor>;
  getInvestorByEmail(email: string): Promise<Investor | undefined>;
  getInvestorById(id: string): Promise<Investor | undefined>;
  getAllInvestors(): Promise<Investor[]>;
  updateInvestorKYCStatus(id: string, status: string): Promise<Investor>;
  updateInvestorAfterPurchase(id: string, fractionsPurchased: number, totalInvested: string): Promise<Investor>;
  updateInvestorDocuments(id: string, documents: Partial<Investor>): Promise<Investor>;
  
  createFraction(fraction: InsertFraction): Promise<Fraction>;
  getFractionsByInvestor(investorId: string): Promise<Fraction[]>;
  
  createProperty(property: InsertProperty): Promise<Property>;
  getPropertyById(id: string): Promise<Property | undefined>;
  getPilotProperty(): Promise<Property | undefined>;
  updatePropertyFractionsSold(id: string, count: number): Promise<Property>;
  
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByInvestor(investorId: string): Promise<Payment[]>;
  updatePaymentStatus(id: string, status: string, tapChargeId?: string): Promise<Payment>;
  
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  
  getAllTemplates(): Promise<AgreementTemplate[]>;
  getTemplateById(id: string): Promise<AgreementTemplate | undefined>;
  createOrUpdateTemplate(template: InsertAgreementTemplate): Promise<AgreementTemplate>;
  updateTemplate(id: string, template: Partial<AgreementTemplate>): Promise<AgreementTemplate>;
  
  createSignatureSession(data: any): Promise<SignatureSession>;
  verifySignatureSession(sessionToken: string, otp: string): Promise<SignatureSession | null>;
  getSessionByToken(sessionToken: string): Promise<SignatureSession | null>;
  checkDuplicateSignature(investorId: string, templateId: string, propertyId: string): Promise<InvestorSignature | null>;
  saveSignature(data: any): Promise<InvestorSignature>;
  saveInvestorSignature(data: any): Promise<InvestorSignature>;
  getInvestorSignatures(investorId: string): Promise<InvestorSignature[]>;
  getPropertySignatureStatus(propertyId: string): Promise<any>;
  
  getSignedDocuments(propertyId: string): Promise<SignedDocument[]>;
  getSignedDocumentById(id: string): Promise<SignedDocument | undefined>;
  generateSignedDocument(propertyId: string, documentType: string, investorId: string, language?: "en" | "ar"): Promise<SignedDocument>;
  
  getDLDExportsByProperty(propertyId: string): Promise<any[]>;
  createDLDExport(data: any): Promise<any>;
  
  createReservation(data: InsertPropertyReservation): Promise<PropertyReservation>;
  getReservationById(id: string): Promise<PropertyReservation | undefined>;
  getReservationsByInvestor(investorId: string): Promise<PropertyReservation[]>;
  getReservationsByProperty(propertyId: string): Promise<PropertyReservation[]>;
  updateReservationStatus(id: string, status: string): Promise<PropertyReservation>;
  cancelReservation(id: string): Promise<void>;
  
  createSlots(reservationId: string, slots: InsertCoOwnerSlot[]): Promise<CoOwnerSlot[]>;
  getSlotsByReservation(reservationId: string): Promise<CoOwnerSlot[]>;
  updateSlotInvestor(slotId: string, investorId: string): Promise<CoOwnerSlot>;
  updateSlotStatus(slotId: string, status: string): Promise<CoOwnerSlot>;
  
  createInvitation(data: InsertCoOwnerInvitation): Promise<CoOwnerInvitation>;
  getInvitationByToken(token: string): Promise<CoOwnerInvitation | undefined>;
  getInvitationsByReservation(reservationId: string): Promise<CoOwnerInvitation[]>;
  acceptInvitation(token: string, investorId: string): Promise<CoOwnerInvitation>;
  declineInvitation(token: string): Promise<CoOwnerInvitation>;
  
  getReservationWithSlots(reservationId: string): Promise<{
    reservation: PropertyReservation;
    slots: CoOwnerSlot[];
    invitations: CoOwnerInvitation[];
  }>;
  
  createReservationWithSlots(data: {
    propertyId: string;
    initiatorInvestorId: string;
    totalSlotsReserved: number;
    slots: Array<{
      slotNumber: number;
      sharePercentage: number;
      invitationEmail?: string;
      investorId?: string;
    }>;
  }): Promise<{ reservation: PropertyReservation; slots: CoOwnerSlot[] }>;
  
  sendInvitationsWithUpdates(
    reservationId: string,
    invitations: Array<{
      slotId: string;
      invitedEmail: string;
      invitationToken: string;
      expiresAt: Date;
    }>,
    initiatorInvestorId: string
  ): Promise<CoOwnerInvitation[]>;
}

export class DbStorage implements IStorage {
  async createInvestor(insertInvestor: InsertInvestor): Promise<Investor> {
    const [investor] = await db.insert(investors).values(insertInvestor).returning();
    return investor;
  }

  async getInvestorByEmail(email: string): Promise<Investor | undefined> {
    const [investor] = await db.select().from(investors).where(eq(investors.email, email));
    return investor;
  }

  async getInvestorById(id: string): Promise<Investor | undefined> {
    const [investor] = await db.select().from(investors).where(eq(investors.id, id));
    return investor;
  }

  async getAllInvestors(): Promise<Investor[]> {
    return await db.select().from(investors).orderBy(desc(investors.createdAt));
  }

  async updateInvestorKYCStatus(id: string, status: string): Promise<Investor> {
    const [investor] = await db
      .update(investors)
      .set({ kycStatus: status })
      .where(eq(investors.id, id))
      .returning();
    return investor;
  }

  async updateInvestorAfterPurchase(id: string, fractionsPurchased: number, totalInvested: string): Promise<Investor> {
    const [investor] = await db
      .update(investors)
      .set({ 
        fractionsPurchased,
        totalInvested,
        paymentStatus: "completed"
      })
      .where(eq(investors.id, id))
      .returning();
    return investor;
  }

  async updateInvestorDocuments(id: string, documents: Partial<Investor>): Promise<Investor> {
    const [investor] = await db
      .update(investors)
      .set(documents)
      .where(eq(investors.id, id))
      .returning();
    return investor;
  }

  async createFraction(insertFraction: InsertFraction): Promise<Fraction> {
    const [fraction] = await db.insert(fractions).values(insertFraction).returning();
    return fraction;
  }

  async getFractionsByInvestor(investorId: string): Promise<Fraction[]> {
    return await db.select().from(fractions).where(eq(fractions.investorId, investorId));
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values(insertProperty).returning();
    return property;
  }

  async getPropertyById(id: string): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async getPilotProperty(): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.isPilot, true));
    return property;
  }

  async updatePropertyFractionsSold(id: string, count: number): Promise<Property> {
    const [property] = await db
      .update(properties)
      .set({ fractionsSold: count })
      .where(eq(properties.id, id))
      .returning();
    return property;
  }

  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const [payment] = await db.insert(payments).values(insertPayment).returning();
    return payment;
  }

  async getPaymentsByInvestor(investorId: string): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.investorId, investorId));
  }

  async updatePaymentStatus(id: string, status: string, tapChargeId?: string): Promise<Payment> {
    const updateData: any = { status };
    if (tapChargeId) {
      updateData.tapChargeId = tapChargeId;
    }
    if (status === "completed") {
      updateData.completedAt = new Date();
    }
    const [payment] = await db
      .update(payments)
      .set(updateData)
      .where(eq(payments.id, id))
      .returning();
    return payment;
  }

  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return admin;
  }

  async getAllTemplates(): Promise<AgreementTemplate[]> {
    return await db.select().from(agreementTemplates).where(eq(agreementTemplates.isActive, true));
  }

  async getTemplateById(id: string): Promise<AgreementTemplate | undefined> {
    const [template] = await db.select().from(agreementTemplates).where(eq(agreementTemplates.id, id));
    return template;
  }

  async createOrUpdateTemplate(template: InsertAgreementTemplate): Promise<AgreementTemplate> {
    const contentHash = generateHash(template.content);
    const contentHashArabic = generateHash(template.contentArabic);
    const [newTemplate] = await db
      .insert(agreementTemplates)
      .values({
        ...template,
        contentHash,
        contentHashArabic,
      })
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<AgreementTemplate>): Promise<AgreementTemplate> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    let shouldIncrementVersion = false;
    
    if (updates.content) {
      updateData.contentHash = generateHash(updates.content);
      shouldIncrementVersion = true;
    }
    
    if (updates.contentArabic) {
      updateData.contentHashArabic = generateHash(updates.contentArabic);
      shouldIncrementVersion = true;
    }
    
    if (shouldIncrementVersion) {
      const [currentTemplate] = await db.select().from(agreementTemplates).where(eq(agreementTemplates.id, id));
      updateData.version = currentTemplate ? currentTemplate.version + 1 : 1;
    }
    
    const [template] = await db
      .update(agreementTemplates)
      .set(updateData)
      .where(eq(agreementTemplates.id, id))
      .returning();
    return template;
  }

  async createSignatureSession(data: {
    investorId: string;
    propertyId: string;
    templateId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<SignatureSession> {
    const sessionToken = generateSecureToken(48);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const [session] = await db
      .insert(signatureSessions)
      .values({
        ...data,
        sessionToken,
        expiresAt,
      })
      .returning();

    await db.insert(signatureAuditLog).values({
      eventType: "session_created",
      investorId: data.investorId,
      sessionId: session.id,
      propertyId: data.propertyId,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return session;
  }

  async verifySignatureSession(sessionToken: string, otp: string): Promise<SignatureSession | null> {
    const [session] = await db
      .select()
      .from(signatureSessions)
      .where(eq(signatureSessions.sessionToken, sessionToken));

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const [updated] = await db
      .update(signatureSessions)
      .set({ otpVerified: true, status: "verified" })
      .where(eq(signatureSessions.id, session.id))
      .returning();

    await db.insert(signatureAuditLog).values({
      eventType: "otp_verified",
      investorId: session.investorId,
      sessionId: session.id,
      propertyId: session.propertyId,
    });

    return updated;
  }

  async getSessionByToken(sessionToken: string): Promise<SignatureSession | null> {
    const [session] = await db
      .select()
      .from(signatureSessions)
      .where(eq(signatureSessions.sessionToken, sessionToken));

    return session || null;
  }

  async checkDuplicateSignature(
    investorId: string, 
    templateId: string, 
    propertyId: string
  ): Promise<InvestorSignature | null> {
    const [existing] = await db
      .select()
      .from(investorSignatures)
      .where(
        and(
          eq(investorSignatures.investorId, investorId),
          eq(investorSignatures.templateId, templateId),
          eq(investorSignatures.propertyId, propertyId)
        )
      );

    return existing || null;
  }

  async saveSignature(data: {
    sessionId: string;
    signatureData: string;
    consentGiven: boolean;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<InvestorSignature> {
    const [session] = await db
      .select()
      .from(signatureSessions)
      .where(eq(signatureSessions.id, data.sessionId));

    if (!session || session.status !== "verified") {
      throw new Error("Invalid or unverified session");
    }

    const encryptedSignature = encryptData(data.signatureData);
    const signatureHash = generateHash(data.signatureData);
    const serverTimestamp = getServerTimestamp();

    const [signature] = await db
      .insert(investorSignatures)
      .values({
        sessionId: data.sessionId,
        investorId: session.investorId,
        templateId: session.templateId,
        propertyId: session.propertyId,
        encryptedSignatureData: encryptedSignature,
        signatureHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        consentGiven: data.consentGiven,
        serverTimestamp,
      })
      .returning();

    await db
      .update(signatureSessions)
      .set({ status: "signed" })
      .where(eq(signatureSessions.id, data.sessionId));

    await db.insert(signatureAuditLog).values({
      eventType: "signature_captured",
      investorId: session.investorId,
      sessionId: data.sessionId,
      propertyId: session.propertyId,
      metadata: JSON.stringify({ signatureHash, serverTimestamp }),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return signature;
  }

  async saveInvestorSignature(data: {
    sessionId?: string;
    investorId: string;
    templateId: string;
    propertyId: string;
    encryptedSignatureData: string;
    signatureHash: string;
    ipAddress?: string;
    userAgent?: string;
    consentGiven?: boolean;
  }): Promise<InvestorSignature> {
    const serverTimestamp = getServerTimestamp();

    const [signature] = await db
      .insert(investorSignatures)
      .values({
        sessionId: data.sessionId || null,
        investorId: data.investorId,
        templateId: data.templateId,
        propertyId: data.propertyId,
        encryptedSignatureData: data.encryptedSignatureData,
        signatureHash: data.signatureHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        consentGiven: data.consentGiven ?? true,
        serverTimestamp,
      })
      .returning();

    await db.insert(signatureAuditLog).values({
      eventType: "signature_captured",
      investorId: data.investorId,
      sessionId: data.sessionId,
      propertyId: data.propertyId,
      metadata: JSON.stringify({ signatureHash: data.signatureHash, serverTimestamp }),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });

    return signature;
  }

  async getInvestorSignatures(investorId: string, propertyId?: string): Promise<InvestorSignature[]> {
    if (propertyId) {
      return await db
        .select()
        .from(investorSignatures)
        .where(
          and(
            eq(investorSignatures.investorId, investorId),
            eq(investorSignatures.propertyId, propertyId)
          )
        );
    }
    
    return await db
      .select()
      .from(investorSignatures)
      .where(eq(investorSignatures.investorId, investorId));
  }

  async getPropertySignatureStatus(propertyId: string): Promise<any> {
    const signatures = await db
      .select()
      .from(investorSignatures)
      .where(eq(investorSignatures.propertyId, propertyId));

    const templates = await this.getAllTemplates();
    
    const status = templates.map(template => {
      // Count DISTINCT investors who have signed this template
      const signaturesForTemplate = signatures.filter(sig => sig.templateId === template.id);
      const uniqueInvestors = new Set(signaturesForTemplate.map(sig => sig.investorId));
      const distinctInvestorCount = uniqueInvestors.size;
      
      return {
        templateId: template.id,
        templateName: template.name,
        documentType: template.templateType,
        signedCount: distinctInvestorCount,
        totalRequired: 4,
        isComplete: distinctInvestorCount >= 4,
        // Include list of investors who have signed for transparency
        signedInvestorIds: Array.from(uniqueInvestors)
      };
    });

    return {
      propertyId,
      documents: status,
      allComplete: status.every(doc => doc.isComplete)
    };
  }

  async getSignedDocuments(propertyId: string): Promise<SignedDocument[]> {
    return await db
      .select()
      .from(signedDocuments)
      .where(eq(signedDocuments.propertyId, propertyId));
  }

  async getSignedDocumentById(id: string): Promise<SignedDocument | undefined> {
    const [document] = await db
      .select()
      .from(signedDocuments)
      .where(eq(signedDocuments.id, id));
    return document;
  }

  async generateSignedDocument(propertyId: string, documentType: string, investorId: string, language: "en" | "ar" = "en"): Promise<SignedDocument> {
    console.log(`Generating signed document for property ${propertyId}, type: ${documentType}, investor: ${investorId}, language: ${language}`);
    
    // Get template for this document type
    const templates = await this.getAllTemplates();
    const template = templates.find(t => t.templateType === documentType);
    if (!template) {
      throw new Error(`Template not found for type: ${documentType}`);
    }

    // Fetch property
    const property = await this.getPropertyById(propertyId);
    if (!property) {
      throw new Error(`Property not found: ${propertyId}`);
    }

    // Get signatures for this document
    const signatures = await db
      .select()
      .from(investorSignatures)
      .where(
        and(
          eq(investorSignatures.propertyId, propertyId),
          eq(investorSignatures.templateId, template.id)
        )
      );

    if (signatures.length === 0) {
      throw new Error(`No signatures found for property ${propertyId} and document type ${documentType}`);
    }

    // Get unique investors and count
    const uniqueInvestors = new Set(signatures.map(sig => sig.investorId));
    const signersCompleted = uniqueInvestors.size;
    const allComplete = signersCompleted >= 4;

    // Get the specified investor for PDF generation
    const investor = await this.getInvestorById(investorId);
    if (!investor) {
      throw new Error(`Investor not found: ${investorId}`);
    }

    // Find this investor's signature for this document
    const investorSignature = signatures.find(sig => sig.investorId === investorId);
    if (!investorSignature) {
      throw new Error(`Signature not found for investor ${investorId} on document ${documentType}`);
    }

    // Decrypt signature data
    let decryptedSignatureData: string;
    try {
      decryptedSignatureData = decryptData(investorSignature.encryptedSignatureData);
    } catch (error) {
      console.error("Failed to decrypt signature data:", error);
      throw new Error("Failed to decrypt signature data");
    }

    // Get co-owners if this is a JOP Declaration (all other investors who signed)
    let coOwners: Investor[] = [];
    if (documentType === "jop_declaration" && signatures.length > 1) {
      const coOwnerIds = Array.from(uniqueInvestors).filter(id => id !== investor.id);
      coOwners = await Promise.all(
        coOwnerIds.map(async (id) => {
          const coOwner = await this.getInvestorById(id);
          if (!coOwner) {
            console.warn(`Co-owner not found: ${id}`);
            return null;
          }
          return coOwner;
        })
      ).then(results => results.filter((co): co is Investor => co !== null));
    }

    // Generate PDF with embedded signature - using investor's preferred language
    let pdfBytes: Uint8Array;
    try {
      pdfBytes = await generateSignedPDF({
        template,
        investor,
        property,
        signature: {
          signatureImage: decryptedSignatureData,
          signedAt: investorSignature.signedAt,
          ipAddress: investorSignature.ipAddress || undefined,
        },
        coOwners: coOwners.length > 0 ? coOwners : undefined,
        language, // Pass language parameter
      });
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Create directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads", "signed-documents");
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
    } catch (error) {
      console.error("Failed to create directory:", error);
      throw new Error("Failed to create uploads directory");
    }

    // Generate filename and file path
    const filename = generateDocumentFilename(documentType, investor.fullName, propertyId);
    const absoluteFilePath = path.join(uploadsDir, filename);
    const relativeFilePath = `/uploads/signed-documents/${filename}`;

    // Write PDF to disk
    try {
      await fs.writeFile(absoluteFilePath, pdfBytes);
      console.log(`PDF saved to: ${absoluteFilePath}`);
    } catch (error) {
      console.error("Failed to write PDF file:", error);
      throw new Error("Failed to write PDF file to disk");
    }

    // Calculate real file hash from PDF bytes
    const fileHash = generateHash(Buffer.from(pdfBytes).toString('base64'));

    // Save to database with real file path and hash
    const [document] = await db
      .insert(signedDocuments)
      .values({
        propertyId,
        documentType,
        filePath: relativeFilePath,
        fileHash,
        templateVersion: template.version,
        allSignaturesComplete: allComplete,
      })
      .returning();

    await db.insert(signatureAuditLog).values({
      eventType: "document_sealed",
      propertyId,
      metadata: JSON.stringify({ 
        documentType, 
        fileHash, 
        filePath: relativeFilePath,
        signersCompleted,
        allComplete 
      }),
    });

    console.log(`Document generated successfully: ${relativeFilePath}`);
    return document;
  }

  async getDLDExportsByProperty(propertyId: string): Promise<any[]> {
    return await db.select().from(dldExports).where(eq(dldExports.propertyId, propertyId));
  }

  async createDLDExport(data: any): Promise<any> {
    const [exportRecord] = await db.insert(dldExports).values(data).returning();
    return exportRecord;
  }

  async createReservation(data: InsertPropertyReservation): Promise<PropertyReservation> {
    const [reservation] = await db.insert(propertyReservations).values(data).returning();
    return reservation;
  }

  async getReservationById(id: string): Promise<PropertyReservation | undefined> {
    const [reservation] = await db.select().from(propertyReservations).where(eq(propertyReservations.id, id));
    return reservation;
  }

  async getReservationsByInvestor(investorId: string): Promise<PropertyReservation[]> {
    return await db
      .select()
      .from(propertyReservations)
      .where(eq(propertyReservations.initiatorInvestorId, investorId))
      .orderBy(desc(propertyReservations.createdAt));
  }

  async getReservationsByProperty(propertyId: string): Promise<PropertyReservation[]> {
    return await db
      .select()
      .from(propertyReservations)
      .where(eq(propertyReservations.propertyId, propertyId))
      .orderBy(desc(propertyReservations.createdAt));
  }

  async updateReservationStatus(id: string, status: string): Promise<PropertyReservation> {
    const [reservation] = await db
      .update(propertyReservations)
      .set({ reservationStatus: status, updatedAt: new Date() })
      .where(eq(propertyReservations.id, id))
      .returning();
    return reservation;
  }

  async cancelReservation(id: string): Promise<void> {
    await db.delete(propertyReservations).where(eq(propertyReservations.id, id));
  }

  async createSlots(reservationId: string, slots: InsertCoOwnerSlot[]): Promise<CoOwnerSlot[]> {
    const slotsWithReservation = slots.map(slot => ({
      ...slot,
      reservationId,
    }));
    return await db.insert(coOwnerSlots).values(slotsWithReservation).returning();
  }

  async getSlotsByReservation(reservationId: string): Promise<CoOwnerSlot[]> {
    return await db
      .select()
      .from(coOwnerSlots)
      .where(eq(coOwnerSlots.reservationId, reservationId));
  }

  async updateSlotInvestor(slotId: string, investorId: string): Promise<CoOwnerSlot> {
    const [slot] = await db
      .update(coOwnerSlots)
      .set({ investorId })
      .where(eq(coOwnerSlots.id, slotId))
      .returning();
    return slot;
  }

  async updateSlotStatus(slotId: string, status: string): Promise<CoOwnerSlot> {
    const [slot] = await db
      .update(coOwnerSlots)
      .set({ invitationStatus: status })
      .where(eq(coOwnerSlots.id, slotId))
      .returning();
    return slot;
  }

  async createInvitation(data: InsertCoOwnerInvitation): Promise<CoOwnerInvitation> {
    const [invitation] = await db.insert(coOwnerInvitations).values(data).returning();
    return invitation;
  }

  async getInvitationByToken(token: string): Promise<CoOwnerInvitation | undefined> {
    const [invitation] = await db
      .select()
      .from(coOwnerInvitations)
      .where(eq(coOwnerInvitations.invitationToken, token));
    return invitation;
  }

  async getInvitationsByReservation(reservationId: string): Promise<CoOwnerInvitation[]> {
    return await db
      .select()
      .from(coOwnerInvitations)
      .where(eq(coOwnerInvitations.reservationId, reservationId));
  }

  async acceptInvitation(token: string, investorId: string): Promise<CoOwnerInvitation> {
    const invitation = await this.getInvitationByToken(token);
    
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been processed");
    }

    if (invitation.expiresAt < new Date()) {
      throw new Error("Invitation has expired");
    }

    await this.updateSlotInvestor(invitation.slotId, investorId);
    await this.updateSlotStatus(invitation.slotId, "accepted");

    const [updatedInvitation] = await db
      .update(coOwnerInvitations)
      .set({ 
        status: "accepted", 
        acceptedAt: new Date() 
      })
      .where(eq(coOwnerInvitations.id, invitation.id))
      .returning();

    return updatedInvitation;
  }

  async declineInvitation(token: string): Promise<CoOwnerInvitation> {
    const invitation = await this.getInvitationByToken(token);
    
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error("Invitation has already been processed");
    }

    await this.updateSlotStatus(invitation.slotId, "declined");

    const [updatedInvitation] = await db
      .update(coOwnerInvitations)
      .set({ status: "declined" })
      .where(eq(coOwnerInvitations.id, invitation.id))
      .returning();

    return updatedInvitation;
  }

  async getReservationWithSlots(reservationId: string): Promise<{
    reservation: PropertyReservation;
    slots: CoOwnerSlot[];
    invitations: CoOwnerInvitation[];
  }> {
    const reservation = await this.getReservationById(reservationId);
    
    if (!reservation) {
      throw new Error("Reservation not found");
    }

    const slots = await this.getSlotsByReservation(reservationId);
    const invitations = await this.getInvitationsByReservation(reservationId);

    return {
      reservation,
      slots,
      invitations,
    };
  }

  async createReservationWithSlots(data: {
    propertyId: string;
    initiatorInvestorId: string;
    totalSlotsReserved: number;
    slots: Array<{
      slotNumber: number;
      sharePercentage: number;
      invitationEmail?: string;
      investorId?: string;
    }>;
  }): Promise<{ reservation: PropertyReservation; slots: CoOwnerSlot[] }> {
    return await db.transaction(async (tx) => {
      // Create the reservation
      const [reservation] = await tx.insert(propertyReservations).values({
        propertyId: data.propertyId,
        initiatorInvestorId: data.initiatorInvestorId,
        totalSlotsReserved: data.totalSlotsReserved,
        reservationStatus: "draft",
      }).returning();

      // Create all slots
      const slotsWithReservation = data.slots.map(slot => ({
        reservationId: reservation.id,
        slotNumber: slot.slotNumber,
        sharePercentage: slot.sharePercentage.toString(),
        invitationEmail: slot.invitationEmail || null,
        investorId: slot.investorId || null,
        invitationStatus: "reserved",
      }));

      const createdSlots = await tx.insert(coOwnerSlots).values(slotsWithReservation).returning();

      return { reservation, slots: createdSlots };
    });
  }

  async sendInvitationsWithUpdates(
    reservationId: string,
    invitations: Array<{
      slotId: string;
      invitedEmail: string;
      invitationToken: string;
      expiresAt: Date;
    }>,
    initiatorInvestorId: string
  ): Promise<CoOwnerInvitation[]> {
    return await db.transaction(async (tx) => {
      // Create all invitations
      const createdInvitations = await Promise.all(
        invitations.map(async (inv) => {
          const [invitation] = await tx.insert(coOwnerInvitations).values({
            reservationId,
            slotId: inv.slotId,
            invitedEmail: inv.invitedEmail,
            invitedByInvestorId: initiatorInvestorId,
            invitationToken: inv.invitationToken,
            expiresAt: inv.expiresAt,
            status: "pending",
          }).returning();

          // Update slot status to "invited"
          await tx
            .update(coOwnerSlots)
            .set({ invitationStatus: "invited" })
            .where(eq(coOwnerSlots.id, inv.slotId));

          return invitation;
        })
      );

      // Update reservation status to "invitations_sent"
      await tx
        .update(propertyReservations)
        .set({ reservationStatus: "invitations_sent", updatedAt: new Date() })
        .where(eq(propertyReservations.id, reservationId));

      return createdInvitations;
    });
  }
}

export const storage = new DbStorage();
