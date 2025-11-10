import { db } from "../db";
import { 
  investors, fractions, properties, payments, adminUsers,
  agreementTemplates, signatureSessions, investorSignatures, signedDocuments, signatureAuditLog
} from "@shared/schema";
import type { 
  Investor, InsertInvestor, Fraction, InsertFraction, Property, InsertProperty, 
  Payment, InsertPayment, AdminUser, AgreementTemplate, InsertAgreementTemplate,
  SignatureSession, InvestorSignature, SignedDocument
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { encryptData, decryptData, generateHash, generateSecureToken, getServerTimestamp } from "./lib/crypto";

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
  generateSignedDocument(propertyId: string, documentType: string): Promise<SignedDocument>;
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
    const [newTemplate] = await db
      .insert(agreementTemplates)
      .values({
        ...template,
        contentHash,
      })
      .returning();
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<AgreementTemplate>): Promise<AgreementTemplate> {
    const updateData: any = { ...updates, updatedAt: new Date() };
    if (updates.content) {
      updateData.contentHash = generateHash(updates.content);
      updateData.version = updates.version ? updates.version + 1 : 1;
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
        documentType: template.documentType,
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

  async generateSignedDocument(propertyId: string, documentType: string): Promise<SignedDocument> {
    console.log(`Generating signed document for property ${propertyId}, type: ${documentType}`);
    
    const filePath = `/uploads/signed-documents/${propertyId}-${documentType}-${Date.now()}.pdf`;
    const fileHash = generateHash(`${propertyId}-${documentType}-${Date.now()}`);

    const [document] = await db
      .insert(signedDocuments)
      .values({
        propertyId,
        documentType,
        filePath,
        fileHash,
        templateVersion: 1,
        allSignaturesComplete: false,
      })
      .returning();

    await db.insert(signatureAuditLog).values({
      eventType: "document_sealed",
      propertyId,
      metadata: JSON.stringify({ documentType, fileHash }),
    });

    return document;
  }
}

export const storage = new DbStorage();
