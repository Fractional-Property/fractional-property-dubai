import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Investor, Property, AgreementTemplate } from "@shared/schema";

interface SignatureData {
  signatureImage: string; // Base64 data URL
  signedAt: Date;
  ipAddress?: string;
}

interface GeneratePDFOptions {
  template: AgreementTemplate;
  investor: Investor;
  property: Property;
  signature: SignatureData;
  coOwners?: Investor[]; // For multi-party documents
}

/**
 * Fill template placeholders with actual data
 */
function fillTemplatePlaceholders(
  content: string,
  investor: Investor,
  property: Property,
  coOwners?: Investor[]
): string {
  let filled = content;

  // Investor placeholders
  filled = filled.replace(/\{INVESTOR_NAME\}/g, investor.fullName);
  filled = filled.replace(/\{INVESTOR_EMAIL\}/g, investor.email);
  filled = filled.replace(/\{INVESTOR_PHONE\}/g, investor.phone);
  filled = filled.replace(/\{INVESTOR_ID\}/g, investor.id);

  // Property placeholders
  filled = filled.replace(/\{PROPERTY_TITLE\}/g, property.title);
  filled = filled.replace(/\{PROPERTY_LOCATION\}/g, property.location);
  filled = filled.replace(/\{PROPERTY_PRICE\}/g, `AED ${Number(property.totalPrice).toLocaleString()}`);
  filled = filled.replace(/\{FRACTION_PRICE\}/g, `AED ${Number(property.pricePerFraction).toLocaleString()}`);
  filled = filled.replace(/\{BEDROOMS\}/g, property.bedrooms?.toString() || "N/A");
  filled = filled.replace(/\{BATHROOMS\}/g, property.bathrooms?.toString() || "N/A");
  filled = filled.replace(/\{AREA\}/g, property.area ? `${property.area} sq ft` : "N/A");

  // Co-owners placeholders (for JOP Declaration)
  if (coOwners && coOwners.length > 0) {
    coOwners.forEach((owner, index) => {
      filled = filled.replace(new RegExp(`\\{CO_OWNER_${index + 1}_NAME\\}`, 'g'), owner.fullName);
      filled = filled.replace(new RegExp(`\\{CO_OWNER_${index + 1}_EMAIL\\}`, 'g'), owner.email);
    });
  }

  // Date placeholders
  const today = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  filled = filled.replace(/\{CURRENT_DATE\}/g, today);

  return filled;
}

/**
 * Generate a professional PDF document with embedded signature
 */
export async function generateSignedPDF(options: GeneratePDFOptions): Promise<Uint8Array> {
  const { template, investor, property, signature, coOwners } = options;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page settings
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  // Add first page
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Document header
  page.drawText("FRACTIONAL OFF-PLAN DUBAI (FOPD)", {
    x: margin,
    y: yPosition,
    size: 16,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;

  page.drawText(template.name, {
    x: margin,
    y: yPosition,
    size: 14,
    font: timesRomanBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPosition -= 35;

  // Fill template content with actual data
  const filledContent = fillTemplatePlaceholders(
    template.content,
    investor,
    property,
    coOwners
  );

  // Split content into paragraphs
  const paragraphs = filledContent.split('\n\n');
  const fontSize = 11;
  const lineHeight = fontSize * 1.4;

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    // Word wrap for long paragraphs
    const words = paragraph.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line + word + ' ';
      const testWidth = timesRomanFont.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > contentWidth && line.length > 0) {
        // Draw current line
        page.drawText(line.trim(), {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
        line = word + ' ';

        // Check if we need a new page
        if (yPosition < margin + 150) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }
      } else {
        line = testLine;
      }
    }

    // Draw remaining text in line
    if (line.trim()) {
      page.drawText(line.trim(), {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    }

    // Paragraph spacing
    yPosition -= lineHeight * 0.5;

    // New page check
    if (yPosition < margin + 150) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  }

  // Add signature section
  yPosition -= 30;
  
  if (yPosition < margin + 150) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
  }

  // Signature header
  page.drawText("ELECTRONICALLY SIGNED", {
    x: margin,
    y: yPosition,
    size: 12,
    font: timesRomanBold,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;

  // Embed signature image
  try {
    // Remove data URL prefix if present
    const base64Data = signature.signatureImage.replace(/^data:image\/png;base64,/, '');
    const signatureImageBytes = Buffer.from(base64Data, 'base64');
    const signatureImg = await pdfDoc.embedPng(signatureImageBytes);
    
    const signatureWidth = 200;
    const signatureHeight = 80;
    
    page.drawImage(signatureImg, {
      x: margin,
      y: yPosition - signatureHeight,
      width: signatureWidth,
      height: signatureHeight,
    });
    
    yPosition -= signatureHeight + 15;
  } catch (error) {
    console.error("Failed to embed signature image:", error);
    // Fallback: just add text
    page.drawText("[Digital Signature]", {
      x: margin,
      y: yPosition,
      size: 10,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    yPosition -= 20;
  }

  // Signer details
  page.drawText(`Signed by: ${investor.fullName}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0.3, 0.3, 0.3),
  });
  yPosition -= 15;

  page.drawText(`Date: ${signature.signedAt.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  })}`, {
    x: margin,
    y: yPosition,
    size: 10,
    font: helveticaFont,
    color: rgb(0.3, 0.3, 0.3),
  });
  yPosition -= 15;

  if (signature.ipAddress) {
    page.drawText(`IP Address: ${signature.ipAddress}`, {
      x: margin,
      y: yPosition,
      size: 9,
      font: helveticaFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Add footer with document metadata
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    const footerY = 30;
    page.drawText(`Document ID: ${template.id} | Version ${template.version}`, {
      x: margin,
      y: footerY,
      size: 8,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
    });
    
    page.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: pageWidth - margin - 60,
      y: footerY,
      size: 8,
      font: helveticaFont,
      color: rgb(0.6, 0.6, 0.6),
    });
  });

  // Serialize the PDF to bytes
  return await pdfDoc.save();
}

/**
 * Generate filename for signed document
 */
export function generateDocumentFilename(
  templateType: string,
  investorName: string,
  propertyId: string
): string {
  const sanitizedName = investorName.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  return `${templateType}_${sanitizedName}_${propertyId}_${timestamp}.pdf`;
}
