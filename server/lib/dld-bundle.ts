import archiver from "archiver";
import { Readable } from "stream";
import { db } from "../../db";
import { 
  investors, fractions, properties, investorSignatures, 
  agreementTemplates, dldExports 
} from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { generateHash } from "./crypto";
import { generateAggregatedPDF } from "./pdf-generator";
import { generateDLDCSV, validateDLDExportData } from "./csv-builder";
import { decryptData } from "./crypto";
import type { Investor, Property, AgreementTemplate, InvestorSignature } from "@shared/schema";
import crypto from "crypto";

interface BundleResult {
  success: boolean;
  zipBuffer?: Buffer;
  bundleHash?: string;
  exportId?: string;
  error?: string;
}

/**
 * Orchestrate the creation of a complete DLD bundle
 * This includes:
 * - 3 aggregated PDFs (one per document type)
 * - 1 CSV file with all co-owner data
 * - 1 metadata.json with hashes and timestamps
 */
export async function orchestrateBundleCreation(
  propertyId: string,
  adminUserId: string
): Promise<BundleResult> {
  try {
    // Step 1: Validate that all data is complete
    const validation = await validateDLDExportData(propertyId);
    if (!validation.isValid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(", ")}`
      };
    }

    // Step 2: Fetch all necessary data
    const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
    if (!property) {
      return { success: false, error: "Property not found" };
    }

    // Fetch all fractions for this property
    const propertyFractions = await db
      .select()
      .from(fractions)
      .where(eq(fractions.propertyId, propertyId));

    // Fetch all investors
    const investorIds = Array.from(new Set(propertyFractions.map(f => f.investorId)));
    const allInvestors: Investor[] = [];
    for (const investorId of investorIds) {
      const [investor] = await db.select().from(investors).where(eq(investors.id, investorId));
      if (investor) {
        allInvestors.push(investor);
      }
    }

    // Fetch all signatures
    const allSignatures = await db
      .select()
      .from(investorSignatures)
      .where(eq(investorSignatures.propertyId, propertyId));

    // Fetch all active templates
    const templates = await db
      .select()
      .from(agreementTemplates)
      .where(eq(agreementTemplates.isActive, true));

    // Step 3: Verify we have all required signatures
    const documentTypes = ['co_ownership', 'power_of_attorney', 'jop_declaration'];
    const requiredSignatures = property.totalFractions * documentTypes.length;
    
    if (allSignatures.length < requiredSignatures) {
      return {
        success: false,
        error: `Only ${allSignatures.length} of ${requiredSignatures} signatures completed`
      };
    }

    // Step 4: Generate CSV
    const csvContent = await generateDLDCSV(propertyId);
    const csvHash = crypto.createHash('sha256').update(csvContent).digest('hex');

    // Step 5: Generate PDFs for each document type
    const pdfBuffers: { [key: string]: Buffer } = {};
    const pdfHashes: { [key: string]: string } = {};

    for (const docType of documentTypes) {
      // Find template for this document type
      const template = templates.find(t => t.templateType === docType);
      if (!template) {
        return { 
          success: false, 
          error: `Template not found for document type: ${docType}` 
        };
      }

      // Get signatures for this document type (one from each investor)
      const docSignatures = allSignatures.filter(sig => sig.templateId === template.id);

      if (docSignatures.length < property.totalFractions) {
        return {
          success: false,
          error: `Not all investors signed ${docType}: ${docSignatures.length}/${property.totalFractions}`
        };
      }

      // Prepare signature data
      const signatureData = await Promise.all(
        docSignatures.map(async (sig) => {
          const investor = allInvestors.find(inv => inv.id === sig.investorId);
          if (!investor) {
            throw new Error(`Investor not found: ${sig.investorId}`);
          }

          // Decrypt signature data
          let signatureImage: string;
          try {
            signatureImage = decryptData(sig.encryptedSignatureData);
          } catch (error) {
            console.error("Failed to decrypt signature, using placeholder");
            signatureImage = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
          }

          return {
            investor,
            signatureImage,
            signedAt: sig.signedAt,
            ipAddress: sig.ipAddress || undefined,
            signatureHash: sig.signatureHash
          };
        })
      );

      // Generate aggregated PDF
      const pdfBuffer = await generateAggregatedPDF({
        template,
        property,
        signatures: signatureData,
        allInvestors
      });

      const pdfHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      
      pdfBuffers[docType] = Buffer.from(pdfBuffer);
      pdfHashes[docType] = pdfHash;
    }

    // Step 6: Create metadata.json
    const metadata = {
      property_id: propertyId,
      property_title: property.title,
      generated_at: new Date().toISOString(),
      generated_by: adminUserId,
      total_investors: allInvestors.length,
      total_signatures: allSignatures.length,
      documents: {
        co_ownership_agreement: {
          filename: "co-ownership-agreement.pdf",
          sha256: pdfHashes.co_ownership
        },
        power_of_attorney: {
          filename: "power-of-attorney.pdf",
          sha256: pdfHashes.power_of_attorney
        },
        jop_declaration: {
          filename: "jop-declaration.pdf",
          sha256: pdfHashes.jop_declaration
        }
      },
      data: {
        co_owners_csv: {
          filename: `property-${propertyId}-co-owners.csv`,
          sha256: csvHash
        }
      },
      investors: allInvestors.map(inv => ({
        investor_id: inv.id,
        full_name: inv.fullName,
        email: inv.email
      }))
    };

    const metadataJson = JSON.stringify(metadata, null, 2);
    const metadataHash = crypto.createHash('sha256').update(metadataJson).digest('hex');

    // Step 7: Create ZIP archive
    const zipBuffer = await createZipArchive(
      propertyId,
      pdfBuffers,
      csvContent,
      metadataJson
    );

    // Calculate bundle hash
    const bundleHash = crypto.createHash('sha256').update(zipBuffer).digest('hex');

    // Step 8: Save export record to database
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filePath = `exports/property-${propertyId}-dld-bundle-${timestamp}.zip`;

    const [exportRecord] = await db
      .insert(dldExports)
      .values({
        propertyId,
        requestedBy: adminUserId,
        bundleHash,
        filePath
      })
      .returning();

    return {
      success: true,
      zipBuffer,
      bundleHash,
      exportId: exportRecord.id
    };

  } catch (error: any) {
    console.error("Error orchestrating bundle creation:", error);
    return {
      success: false,
      error: error.message || "Unknown error during bundle creation"
    };
  }
}

/**
 * Create ZIP archive with proper directory structure
 */
async function createZipArchive(
  propertyId: string,
  pdfBuffers: { [key: string]: Buffer },
  csvContent: string,
  metadataJson: string
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', (err: Error) => reject(err));

    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const basePath = `property-${propertyId}-dld-bundle-${timestamp}`;

    // Add PDFs to documents folder
    archive.append(pdfBuffers.co_ownership, { 
      name: `${basePath}/documents/co-ownership-agreement.pdf` 
    });
    archive.append(pdfBuffers.power_of_attorney, { 
      name: `${basePath}/documents/power-of-attorney.pdf` 
    });
    archive.append(pdfBuffers.jop_declaration, { 
      name: `${basePath}/documents/jop-declaration.pdf` 
    });

    // Add CSV to data folder
    archive.append(csvContent, { 
      name: `${basePath}/data/property-${propertyId}-co-owners.csv` 
    });

    // Add metadata to root
    archive.append(metadataJson, { 
      name: `${basePath}/metadata.json` 
    });

    archive.finalize();
  });
}

/**
 * Get export history for a property
 */
export async function getExportHistory(propertyId: string) {
  return await db
    .select()
    .from(dldExports)
    .where(eq(dldExports.propertyId, propertyId));
}
