import { db } from "../db";
import { investors, fractions, properties, payments, adminUsers } from "@shared/schema";
import type { Investor, InsertInvestor, Fraction, InsertFraction, Property, InsertProperty, Payment, InsertPayment, AdminUser } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

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
}

export const storage = new DbStorage();
