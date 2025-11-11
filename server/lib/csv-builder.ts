import { db } from "../../db";
import { investors, fractions, properties, investorSignatures, agreementTemplates } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { Investor, Property, Fraction, InvestorSignature, AgreementTemplate } from "@shared/schema";

interface CSVRowData {
  property_id: string;
  property_title: string;
  handover_deadline: string;
  document_type: string;
  owner_index: number;
  investor_id: string;
  full_name: string;
  email: string;
  phone: string;
  passport_number: string;
  emirates_id: string;
  fraction_number: number;
  ownership_percent: string;
  signature_timestamp: string;
  signature_ip: string;
  signature_hash: string;
}

/**
 * Generate CSV data for DLD filing
 * 
 * @param propertyId - The property ID to generate CSV for
 * @returns CSV string with all co-owner data
 */
export async function generateDLDCSV(propertyId: string): Promise<string> {
  // Fetch property
  const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
  if (!property) {
    throw new Error(`Property ${propertyId} not found`);
  }

  // Calculate handover deadline (handover date + 60 days) - FIX #4
  const handoverDate = property.handoverDate ? new Date(property.handoverDate) : new Date();
  const handoverDeadline = new Date(handoverDate);
  handoverDeadline.setDate(handoverDeadline.getDate() + 60);
  const formattedDeadline = handoverDeadline.toISOString().split('T')[0];

  // Fetch all fractions for this property
  const propertyFractions = await db
    .select()
    .from(fractions)
    .where(eq(fractions.propertyId, propertyId));

  if (propertyFractions.length === 0) {
    throw new Error(`No fractions found for property ${propertyId}`);
  }

  // Fetch ALL investors at once using inArray - FIX #1
  const investorIds = Array.from(new Set(propertyFractions.map(f => f.investorId)));
  const allInvestors = await db
    .select()
    .from(investors)
    .where(inArray(investors.id, investorIds));

  if (allInvestors.length === 0) {
    throw new Error(`No investors found for property ${propertyId}`);
  }

  // Validate KYC data - FIX #3
  for (const investor of allInvestors) {
    if (!investor.passportNumber || !investor.emiratesId) {
      throw new Error(`KYC data missing for investor ${investor.fullName} (${investor.email})`);
    }
  }

  // Fetch all signatures for this property
  const allSignatures = await db
    .select()
    .from(investorSignatures)
    .where(eq(investorSignatures.propertyId, propertyId));

  // Fetch all agreement templates to map document types to template IDs - FIX #2
  const allTemplates = await db
    .select()
    .from(agreementTemplates)
    .where(eq(agreementTemplates.isActive, true));

  // Map document types to template IDs
  const templateMap = new Map<string, string>();
  for (const template of allTemplates) {
    templateMap.set(template.templateType, template.id);
  }

  // Document types to include
  const documentTypes = ['co_ownership', 'power_of_attorney', 'jop_declaration'];

  // Build CSV rows
  const csvRows: CSVRowData[] = [];

  for (const docType of documentTypes) {
    // Get the template ID for this document type - FIX #2
    const templateId = templateMap.get(docType);
    if (!templateId) {
      console.warn(`No active template found for document type: ${docType}`);
      continue;
    }

    // Filter signatures by document type - FIX #2
    const documentSignatures = allSignatures.filter(sig => sig.templateId === templateId);

    // Create a row for each investor-document combination
    allInvestors.forEach((investor, index) => {
      // Find this investor's fraction
      const investorFraction = propertyFractions.find(f => f.investorId === investor.id);
      if (!investorFraction) return;

      // Find signature for this investor and document type - FIX #2
      const investorSignature = documentSignatures.find(sig => sig.investorId === investor.id);

      if (investorSignature) {
        // Calculate ownership percent (25% for 4-fraction model)
        const ownershipPercent = (100 / property.totalFractions).toFixed(2);

        csvRows.push({
          property_id: property.id,
          property_title: property.title,
          handover_deadline: formattedDeadline, // FIX #4
          document_type: docType,
          owner_index: index + 1,
          investor_id: investor.id,
          full_name: investor.fullName,
          email: investor.email,
          phone: investor.phone,
          passport_number: investor.passportNumber || "PENDING", // FIX #3
          emirates_id: investor.emiratesId || "PENDING", // FIX #3
          fraction_number: investorFraction.fractionNumber,
          ownership_percent: `${ownershipPercent}%`,
          signature_timestamp: investorSignature.signedAt.toISOString(),
          signature_ip: investorSignature.ipAddress || "N/A",
          signature_hash: investorSignature.signatureHash,
        });
      }
    });
  }

  // Convert to CSV format
  const headers = [
    'property_id', 'property_title', 'handover_deadline', 'document_type',
    'owner_index', 'investor_id', 'full_name', 'email', 'phone',
    'passport_number', 'emirates_id', 'fraction_number', 'ownership_percent',
    'signature_timestamp', 'signature_ip', 'signature_hash'
  ];

  const csvLines = [headers.join(',')];

  for (const row of csvRows) {
    const values = headers.map(header => {
      const value = row[header as keyof CSVRowData];
      // Escape commas and quotes in CSV values
      const stringValue = String(value);
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

/**
 * Validate that all required data is present for DLD export
 */
export async function validateDLDExportData(propertyId: string): Promise<{
  isValid: boolean;
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Check property exists
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
    if (!property) {
      errors.push(`Property ${propertyId} not found`);
      return { isValid: false, errors };
    }

    // Check all 4 fractions are sold
    if (property.fractionsSold < property.totalFractions) {
      errors.push(`Only ${property.fractionsSold} of ${property.totalFractions} fractions sold`);
    }

    // Fetch fractions
    const propertyFractions = await db
      .select()
      .from(fractions)
      .where(eq(fractions.propertyId, propertyId));

    if (propertyFractions.length < property.totalFractions) {
      errors.push(`Only ${propertyFractions.length} fractions found, expected ${property.totalFractions}`);
    }

    // Fetch all investors at once using inArray - FIX #1
    const investorIds = Array.from(new Set(propertyFractions.map(f => f.investorId)));
    const allInvestors = await db
      .select()
      .from(investors)
      .where(inArray(investors.id, investorIds));

    // Check all investors have KYC documents - FIX #5
    const missingKYC = allInvestors.filter(inv => 
      !inv.passportNumber || !inv.emiratesId
    );

    if (missingKYC.length > 0) {
      errors.push(`Missing KYC data for investors: ${missingKYC.map(i => i.fullName).join(', ')}`);
    }

    // Check all signatures are complete (3 documents × 4 investors = 12 signatures)
    const allSignatures = await db
      .select()
      .from(investorSignatures)
      .where(eq(investorSignatures.propertyId, propertyId));

    const requiredSignatures = property.totalFractions * 3; // 3 document types
    if (allSignatures.length < requiredSignatures) {
      errors.push(`Only ${allSignatures.length} of ${requiredSignatures} signatures completed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error: any) {
    errors.push(`Validation error: ${error.message}`);
    return { isValid: false, errors };
  }
}
