import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, decimal, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const investors = pgTable("investors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  fractionsPurchased: integer("fractions_purchased").notNull().default(0),
  totalInvested: decimal("total_invested", { precision: 12, scale: 2 }).notNull().default("0"),
  kycStatus: text("kyc_status").notNull().default("pending"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  passportDocPath: text("passport_doc_path"),
  passportNumber: text("passport_number"),
  emiratesId: text("emirates_id"),
  proofOfAddressPath: text("proof_of_address_path"),
  bankStatementPath: text("bank_statement_path"),
  documentsUploadedAt: timestamp("documents_uploaded_at"),
  preferredLanguage: varchar("preferred_language").notNull().default("en"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fractions = pgTable("fractions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => investors.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  fractionNumber: integer("fraction_number").notNull(),
  purchasePrice: decimal("purchase_price", { precision: 12, scale: 2 }).notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  tapChargeId: text("tap_charge_id"),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  location: text("location").notNull(),
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }).notNull(),
  pricePerFraction: decimal("price_per_fraction", { precision: 12, scale: 2 }).notNull(),
  totalFractions: integer("total_fractions").notNull().default(4),
  fractionsSold: integer("fractions_sold").notNull().default(0),
  description: text("description"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"),
  isPilot: boolean("is_pilot").notNull().default(false),
  escrowIban: text("escrow_iban"),
  handoverDate: timestamp("handover_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => investors.id),
  fractionId: varchar("fraction_id").notNull().references(() => fractions.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("AED"),
  tapChargeId: text("tap_charge_id"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Agreement templates with versioning and checksums for tamper detection
export const agreementTemplates = pgTable("agreement_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  templateType: text("template_type").notNull(), // "co_ownership" | "power_of_attorney" | "jop_declaration"
  content: text("content").notNull(), // Rich text content with placeholders (English)
  contentHash: text("content_hash").notNull(), // SHA-256 hash for integrity
  contentArabic: text("content_arabic").notNull(), // Arabic content with placeholders
  contentHashArabic: text("content_hash_arabic").notNull(), // SHA-256 hash for Arabic content
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  templatePdfPath: text("template_pdf_path"), // Optional: Pre-approved PDF template
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Signature sessions for OTP-verified multi-step signing
export const signatureSessions = pgTable("signature_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investorId: varchar("investor_id").notNull().references(() => investors.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  templateId: varchar("template_id").notNull().references(() => agreementTemplates.id),
  sessionToken: text("session_token").notNull(), // Secure random token
  otpVerified: boolean("otp_verified").notNull().default(false),
  status: text("status").notNull().default("pending"), // "pending" | "verified" | "signed" | "expired"
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Signer assignments for multi-party agreements
export const signerAssignments = pgTable("signer_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  investorId: varchar("investor_id").notNull().references(() => investors.id),
  documentType: text("document_type").notNull(), // "co_ownership" | "power_of_attorney" | "jop_declaration"
  signerRole: text("signer_role").notNull().default("co_owner"), // "co_owner" | "attorney" | "witness"
  signingOrder: integer("signing_order").notNull().default(1),
  status: text("status").notNull().default("pending"), // "pending" | "signed" | "declined"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Encrypted investor signatures with audit trail
export const investorSignatures = pgTable("investor_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").references(() => signatureSessions.id),
  investorId: varchar("investor_id").notNull().references(() => investors.id),
  templateId: varchar("template_id").notNull().references(() => agreementTemplates.id),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  encryptedSignatureData: text("encrypted_signature_data").notNull(), // Encrypted base64 signature
  signatureHash: text("signature_hash").notNull(), // SHA-256 hash for verification
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signedAt: timestamp("signed_at").notNull().defaultNow(),
  consentGiven: boolean("consent_given").notNull().default(true),
  serverTimestamp: text("server_timestamp").notNull(), // UTC timestamp for non-repudiation
}, (table) => ({
  uniqueInvestorSignature: sql`UNIQUE (investor_id, template_id, property_id)`
}));

// Generated and sealed documents with certificate pages
export const signedDocuments = pgTable("signed_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  documentType: text("document_type").notNull(), // "co_ownership" | "power_of_attorney" | "jop_declaration"
  filePath: text("file_path").notNull(), // Encrypted PDF in secure storage
  fileHash: text("file_hash").notNull(), // SHA-256 hash of final PDF
  templateVersion: integer("template_version").notNull(),
  allSignaturesComplete: boolean("all_signatures_complete").notNull().default(false),
  sealedAt: timestamp("sealed_at"),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
});

// Immutable audit log for all signing activities
export const signatureAuditLog = pgTable("signature_audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // "session_created" | "otp_verified" | "signature_captured" | "document_sealed"
  investorId: varchar("investor_id").references(() => investors.id),
  sessionId: varchar("session_id").references(() => signatureSessions.id),
  propertyId: varchar("property_id").references(() => properties.id),
  metadata: text("metadata"), // JSON string with event details
  requestHash: text("request_hash"), // Hash of request data
  responseHash: text("response_hash"), // Hash of response data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// DLD export audit trail
export const dldExports = pgTable("dld_exports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  requestedBy: varchar("requested_by").notNull(),
  bundleHash: varchar("bundle_hash").notNull(),
  filePath: varchar("file_path").notNull(),
});

// Property reservations - tracks investor interest and share allocation
export const propertyReservations = pgTable("property_reservations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull().references(() => properties.id),
  initiatorInvestorId: varchar("initiator_investor_id").notNull().references(() => investors.id), // Investor who started the reservation
  reservationStatus: text("reservation_status").notNull().default("draft"), // "draft" | "invitations_sent" | "all_signed" | "payment_pending" | "payment_complete" | "cancelled"
  totalSlotsReserved: integer("total_slots_reserved").notNull().default(1), // Max 4
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  propertyIdIdx: index("idx_propertyReservations_propertyId").on(table.propertyId),
  checkTotalSlotsReserved: sql`CHECK (total_slots_reserved BETWEEN 1 AND 4)`,
  uniqueActiveReservation: sql`UNIQUE (property_id) WHERE reservation_status IN ('draft', 'invitations_sent', 'all_signed', 'payment_pending')`,
}));

// Co-owner slots - individual share allocations within a reservation
export const coOwnerSlots = pgTable("co_owner_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservationId: varchar("reservation_id").notNull().references(() => propertyReservations.id, { onDelete: "cascade" }),
  slotNumber: integer("slot_number").notNull(), // 1-4
  investorId: varchar("investor_id").references(() => investors.id), // null if slot not yet claimed
  sharePercentage: decimal("share_percentage", { precision: 5, scale: 2 }).notNull(), // e.g., 25.00, 33.33, 50.00
  invitationStatus: text("invitation_status").notNull().default("reserved"), // "reserved" | "invited" | "accepted" | "declined"
  invitationEmail: text("invitation_email"), // Email of invited co-owner
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  reservationIdIdx: index("idx_coOwnerSlots_reservationId").on(table.reservationId),
  uniqueReservationSlot: sql`UNIQUE (reservation_id, slot_number)`,
  uniqueReservationEmail: sql`UNIQUE (reservation_id, invitation_email)`,
  checkSlotNumber: sql`CHECK (slot_number >= 1 AND slot_number <= 4)`,
  checkSharePercentage: sql`CHECK (share_percentage > 0 AND share_percentage <= 100)`,
}));

// Co-owner invitations - email invites for co-ownership
export const coOwnerInvitations = pgTable("co_owner_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reservationId: varchar("reservation_id").notNull().references(() => propertyReservations.id, { onDelete: "cascade" }),
  slotId: varchar("slot_id").notNull().references(() => coOwnerSlots.id, { onDelete: "cascade" }),
  invitedEmail: text("invited_email").notNull(),
  invitedByInvestorId: varchar("invited_by_investor_id").notNull().references(() => investors.id),
  invitationToken: text("invitation_token").notNull().unique(), // Secure token for link
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "declined" | "expired"
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  reservationIdIdx: index("idx_coOwnerInvitations_reservationId").on(table.reservationId),
  uniqueSlotInvitation: sql`UNIQUE (slot_id)`,
}));

export const insertInvestorSchema = createInsertSchema(investors).omit({
  id: true,
  createdAt: true,
  fractionsPurchased: true,
  totalInvested: true,
  kycStatus: true,
  paymentStatus: true,
}).extend({
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
});

export const insertFractionSchema = createInsertSchema(fractions).omit({
  id: true,
  purchasedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertAgreementTemplateSchema = createInsertSchema(agreementTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  version: true,
  contentHash: true,
  contentHashArabic: true,
}).extend({
  name: z.string().min(1, "Template name is required"),
  content: z.string().min(10, "English content must be at least 10 characters"),
  contentArabic: z.string().min(10, "Arabic content must be at least 10 characters"),
  templateType: z.enum(["co_ownership", "power_of_attorney", "jop_declaration"]),
});

export const insertSignatureSessionSchema = createInsertSchema(signatureSessions).omit({
  id: true,
  createdAt: true,
}).extend({
  sessionToken: z.string().min(32, "Session token required"),
});

export const insertSignerAssignmentSchema = createInsertSchema(signerAssignments).omit({
  id: true,
  createdAt: true,
});

export const insertInvestorSignatureSchema = createInsertSchema(investorSignatures).omit({
  id: true,
  signedAt: true,
  signatureHash: true,
  serverTimestamp: true,
}).extend({
  encryptedSignatureData: z.string().min(10, "Signature data is required"),
});

export const insertSignedDocumentSchema = createInsertSchema(signedDocuments).omit({
  id: true,
  generatedAt: true,
  fileHash: true,
  sealedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(signatureAuditLog).omit({
  id: true,
  timestamp: true,
});

export const insertDldExportSchema = createInsertSchema(dldExports).omit({
  id: true,
  generatedAt: true,
});

export const insertPropertyReservationSchema = createInsertSchema(propertyReservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  totalSlotsReserved: z.number().min(1).max(4, "Maximum 4 co-owners allowed"),
});

export const insertCoOwnerSlotSchema = createInsertSchema(coOwnerSlots).omit({
  id: true,
  createdAt: true,
}).extend({
  slotNumber: z.number().min(1).max(4),
  sharePercentage: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid percentage format"),
});

export const insertCoOwnerInvitationSchema = createInsertSchema(coOwnerInvitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
}).extend({
  invitedEmail: z.string().email("Invalid email address"),
  invitationToken: z.string().min(32, "Invitation token required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const submitSignatureSchema = z.object({
  sessionToken: z.string().min(32, "Session token is required"),
  signatureDataUrl: z.string().min(10, "Signature data is required"),
  consentGiven: z.boolean().default(true),
});

export const createReservationSchema = z.object({
  propertyId: z.string().uuid("Invalid property ID"),
  totalSlotsReserved: z.number().int().min(1).max(4, "Total slots must be between 1 and 4"),
  slots: z.array(z.object({
    slotNumber: z.number().int().min(1).max(4, "Slot number must be between 1 and 4"),
    sharePercentage: z.number().min(0).max(100, "Share percentage must be between 0 and 100"),
    invitationEmail: z.string().email("Invalid email address").optional(),
    investorId: z.string().uuid().optional(),
  })).min(1, "At least one slot is required").max(4, "Maximum 4 slots allowed")
}).refine(
  data => {
    const total = data.slots.reduce((sum, slot) => sum + slot.sharePercentage, 0);
    return Math.abs(total - 100) < 0.01;
  },
  { message: "Share percentages must add up to 100%" }
).refine(
  data => data.slots.length === data.totalSlotsReserved,
  { message: "Number of slots must match totalSlotsReserved" }
).refine(
  data => {
    const slotNumbers = data.slots.map(s => s.slotNumber);
    return new Set(slotNumbers).size === slotNumbers.length;
  },
  { message: "Slot numbers must be unique" }
);

export const sendInvitationsSchema = z.object({
  invitations: z.array(z.object({
    slotId: z.string().uuid("Invalid slot ID"),
    invitedEmail: z.string().email("Invalid email address"),
  })).min(1, "At least one invitation is required")
});

export const acceptInvitationSchema = z.object({
  invitationToken: z.string().min(32, "Invalid invitation token"),
  investorId: z.string().uuid("Invalid investor ID"),
});

export type Investor = typeof investors.$inferSelect;
export type InsertInvestor = z.infer<typeof insertInvestorSchema>;
export type Fraction = typeof fractions.$inferSelect;
export type InsertFraction = z.infer<typeof insertFractionSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;
export type AgreementTemplate = typeof agreementTemplates.$inferSelect;
export type InsertAgreementTemplate = z.infer<typeof insertAgreementTemplateSchema>;
export type SignatureSession = typeof signatureSessions.$inferSelect;
export type InsertSignatureSession = z.infer<typeof insertSignatureSessionSchema>;
export type SignerAssignment = typeof signerAssignments.$inferSelect;
export type InsertSignerAssignment = z.infer<typeof insertSignerAssignmentSchema>;
export type InvestorSignature = typeof investorSignatures.$inferSelect;
export type InsertInvestorSignature = z.infer<typeof insertInvestorSignatureSchema>;
export type SignedDocument = typeof signedDocuments.$inferSelect;
export type InsertSignedDocument = z.infer<typeof insertSignedDocumentSchema>;
export type AuditLog = typeof signatureAuditLog.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type DldExport = typeof dldExports.$inferSelect;
export type InsertDldExport = z.infer<typeof insertDldExportSchema>;
export type PropertyReservation = typeof propertyReservations.$inferSelect;
export type InsertPropertyReservation = z.infer<typeof insertPropertyReservationSchema>;
export type CoOwnerSlot = typeof coOwnerSlots.$inferSelect;
export type InsertCoOwnerSlot = z.infer<typeof insertCoOwnerSlotSchema>;
export type CoOwnerInvitation = typeof coOwnerInvitations.$inferSelect;
export type InsertCoOwnerInvitation = z.infer<typeof insertCoOwnerInvitationSchema>;
