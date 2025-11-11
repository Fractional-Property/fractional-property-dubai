import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import type { Investor, Property, AgreementTemplate } from "@shared/schema";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import arabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";

// Load Arabic font at module level
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const arabicFontPath = path.join(__dirname, "../fonts/NotoSansArabic-Regular.ttf");
let arabicFontBytes: Uint8Array | null = null;

// Create bidi instance at module level
const bidi = bidiFactory();

/**
 * Lazy load Arabic font when needed
 */
async function getArabicFont(): Promise<Uint8Array> {
  if (!arabicFontBytes) {
    arabicFontBytes = fs.readFileSync(arabicFontPath);
  }
  return arabicFontBytes;
}

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
  language?: "en" | "ar"; // Language for PDF generation
}

/**
 * Convert Western Arabic numerals (0-9) to Eastern Arabic numerals (٠-٩)
 */
function toArabicNumerals(text: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return text.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
}

/**
 * Format date for Arabic locale
 */
function formatArabicDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  // Use Arabic locale
  const formatted = date.toLocaleDateString('ar-AE', options);
  return toArabicNumerals(formatted);
}

/**
 * Format number for Arabic locale with Arabic numerals
 */
function formatArabicNumber(num: number): string {
  const formatted = num.toLocaleString('en-US'); // Get comma-separated format first
  return toArabicNumerals(formatted);
}

/**
 * Shapes Arabic text for proper rendering in PDF
 * Handles RTL text direction and glyph joining
 * Uses proper Unicode bidirectional algorithm to preserve number order
 */
function shapeArabicText(text: string, language: "en" | "ar"): string {
  if (language !== "ar") {
    return text; // No shaping needed for English
  }
  
  try {
    // Step 1: Reshape Arabic glyphs (connects them properly)
    const shaped = arabicReshaper(text);
    
    // Step 2: Apply proper Unicode bidi algorithm (preserves number order)
    const bidiText = bidi.reorderVisually(shaped, "RTL");
    
    return bidiText;
  } catch (error) {
    console.error("Arabic shaping failed:", error);
    return text; // Fallback to unshaped text
  }
}

/**
 * Fill template placeholders with actual data
 */
function fillTemplatePlaceholders(
  content: string,
  investor: Investor,
  property: Property,
  coOwners?: Investor[],
  language: "en" | "ar" = "en"
): string {
  let filled = content;

  // Investor placeholders
  filled = filled.replace(/\{INVESTOR_NAME\}/g, investor.fullName);
  filled = filled.replace(/\{INVESTOR_EMAIL\}/g, investor.email);
  filled = filled.replace(/\{INVESTOR_PHONE\}/g, investor.phone);
  filled = filled.replace(/\{INVESTOR_ID\}/g, investor.id);

  // Property placeholders with language-specific formatting
  filled = filled.replace(/\{PROPERTY_TITLE\}/g, property.title);
  filled = filled.replace(/\{PROPERTY_LOCATION\}/g, property.location);
  
  const totalPrice = Number(property.totalPrice);
  const fractionPrice = Number(property.pricePerFraction);
  
  if (language === "ar") {
    filled = filled.replace(/\{PROPERTY_PRICE\}/g, `${formatArabicNumber(totalPrice)} درهم`);
    filled = filled.replace(/\{FRACTION_PRICE\}/g, `${formatArabicNumber(fractionPrice)} درهم`);
    filled = filled.replace(/\{BEDROOMS\}/g, property.bedrooms ? toArabicNumerals(property.bedrooms.toString()) : "غير محدد");
    filled = filled.replace(/\{BATHROOMS\}/g, property.bathrooms ? toArabicNumerals(property.bathrooms.toString()) : "غير محدد");
    filled = filled.replace(/\{AREA\}/g, property.area ? `${toArabicNumerals(property.area.toString())} قدم مربع` : "غير محدد");
  } else {
    filled = filled.replace(/\{PROPERTY_PRICE\}/g, `AED ${totalPrice.toLocaleString()}`);
    filled = filled.replace(/\{FRACTION_PRICE\}/g, `AED ${fractionPrice.toLocaleString()}`);
    filled = filled.replace(/\{BEDROOMS\}/g, property.bedrooms?.toString() || "N/A");
    filled = filled.replace(/\{BATHROOMS\}/g, property.bathrooms?.toString() || "N/A");
    filled = filled.replace(/\{AREA\}/g, property.area ? `${property.area} sq ft` : "N/A");
  }

  // Co-owners placeholders (for JOP Declaration)
  if (coOwners && coOwners.length > 0) {
    coOwners.forEach((owner, index) => {
      filled = filled.replace(new RegExp(`\\{CO_OWNER_${index + 1}_NAME\\}`, 'g'), owner.fullName);
      filled = filled.replace(new RegExp(`\\{CO_OWNER_${index + 1}_EMAIL\\}`, 'g'), owner.email);
    });
  }

  // Date placeholders with language-specific formatting
  const today = new Date();
  if (language === "ar") {
    filled = filled.replace(/\{CURRENT_DATE\}/g, formatArabicDate(today));
  } else {
    const formattedDate = today.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    filled = filled.replace(/\{CURRENT_DATE\}/g, formattedDate);
  }

  return filled;
}

/**
 * Generate a professional PDF document with embedded signature
 */
export async function generateSignedPDF(options: GeneratePDFOptions): Promise<Uint8Array> {
  const { template, investor, property, signature, coOwners, language = "en" } = options;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts based on language
  let bodyFont;
  let headerFont;
  let detailFont;
  
  if (language === "ar") {
    // For Arabic, embed Noto Sans Arabic font
    const arabicBytes = await getArabicFont();
    const arabicFont = await pdfDoc.embedFont(arabicBytes);
    bodyFont = arabicFont;
    headerFont = arabicFont;
    detailFont = arabicFont;
  } else {
    // For English, use standard fonts
    bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    headerFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    detailFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  }

  // Page settings
  const pageWidth = 595; // A4 width in points
  const pageHeight = 842; // A4 height in points
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);
  
  // RTL text alignment for Arabic
  const isRTL = language === "ar";

  // Add first page
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Document header - language specific
  const headerText = isRTL ? "دبي للملكية الجزئية خارج الخطة (FOPD)" : "FRACTIONAL OFF-PLAN DUBAI (FOPD)";
  const headerX = isRTL ? pageWidth - margin : margin;
  
  page.drawText(shapeArabicText(headerText, language), {
    x: headerX,
    y: yPosition,
    size: 16,
    font: headerFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;

  page.drawText(shapeArabicText(template.name, language), {
    x: headerX,
    y: yPosition,
    size: 14,
    font: headerFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPosition -= 35;

  // Select content based on language
  const templateContent = isRTL ? template.contentArabic : template.content;

  // Fill template content with actual data
  const filledContent = fillTemplatePlaceholders(
    templateContent,
    investor,
    property,
    coOwners,
    language
  );

  // Split content into paragraphs
  const paragraphs = filledContent.split('\n\n');
  const fontSize = 11;
  const lineHeight = fontSize * 1.4;

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    // Handle single newlines within paragraphs
    const lines = paragraph.split('\n');
    
    for (const textLine of lines) {
      if (!textLine.trim()) {
        // Empty line - add spacing
        yPosition -= lineHeight * 0.5;
        continue;
      }

      // Word wrap for long lines
      const words = textLine.split(' ');
      let line = '';

      for (const word of words) {
        const testLine = line + word + ' ';
        // Remove any remaining control characters before measuring
        const cleanTestLine = testLine.replace(/[\r\n\t]/g, ' ');
        const testWidth = bodyFont.widthOfTextAtSize(cleanTestLine, fontSize);

        if (testWidth > contentWidth && line.length > 0) {
          // Draw current line
          const cleanLine = line.trim().replace(/[\r\n\t]/g, ' ');
          page.drawText(shapeArabicText(cleanLine, language), {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: bodyFont,
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
        const cleanLine = line.trim().replace(/[\r\n\t]/g, ' ');
        page.drawText(shapeArabicText(cleanLine, language), {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: bodyFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
      }

      // New page check after each line
      if (yPosition < margin + 150) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        yPosition = pageHeight - margin;
      }
    }

    // Paragraph spacing
    yPosition -= lineHeight * 0.5;
  }

  // Add signature section
  yPosition -= 30;
  
  if (yPosition < margin + 150) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
  }

  // Signature header - language specific
  const signatureHeaderText = isRTL ? "موقع إلكترونياً" : "ELECTRONICALLY SIGNED";
  const signatureX = isRTL ? pageWidth - margin : margin;
  
  page.drawText(shapeArabicText(signatureHeaderText, language), {
    x: signatureX,
    y: yPosition,
    size: 12,
    font: headerFont,
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
    const imgX = isRTL ? pageWidth - margin - signatureWidth : margin;
    
    page.drawImage(signatureImg, {
      x: imgX,
      y: yPosition - signatureHeight,
      width: signatureWidth,
      height: signatureHeight,
    });
    
    yPosition -= signatureHeight + 15;
  } catch (error) {
    console.error("Failed to embed signature image:", error);
    // Fallback: just add text
    const fallbackText = isRTL ? "[توقيع رقمي]" : "[Digital Signature]";
    page.drawText(shapeArabicText(fallbackText, language), {
      x: signatureX,
      y: yPosition,
      size: 10,
      font: detailFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    yPosition -= 20;
  }

  // Signer details - language specific
  const signedByLabel = isRTL ? `وقعه: ${investor.fullName}` : `Signed by: ${investor.fullName}`;
  page.drawText(shapeArabicText(signedByLabel, language), {
    x: signatureX,
    y: yPosition,
    size: 10,
    font: detailFont,
    color: rgb(0.3, 0.3, 0.3),
  });
  yPosition -= 15;

  const dateLabel = isRTL ? "التاريخ:" : "Date:";
  const dateValue = isRTL 
    ? formatArabicDate(signature.signedAt)
    : signature.signedAt.toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      });
  
  page.drawText(shapeArabicText(`${dateLabel} ${dateValue}`, language), {
    x: signatureX,
    y: yPosition,
    size: 10,
    font: detailFont,
    color: rgb(0.3, 0.3, 0.3),
  });
  yPosition -= 15;

  if (signature.ipAddress) {
    const ipLabel = isRTL ? `عنوان IP: ${signature.ipAddress}` : `IP Address: ${signature.ipAddress}`;
    page.drawText(shapeArabicText(ipLabel, language), {
      x: signatureX,
      y: yPosition,
      size: 9,
      font: detailFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Add footer with document metadata
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    const footerY = 30;
    page.drawText(shapeArabicText(`Document ID: ${template.id} | Version ${template.version}`, language), {
      x: margin,
      y: footerY,
      size: 8,
      font: detailFont,
      color: rgb(0.6, 0.6, 0.6),
    });
    
    page.drawText(shapeArabicText(`Page ${index + 1} of ${pages.length}`, language), {
      x: pageWidth - margin - 60,
      y: footerY,
      size: 8,
      font: detailFont,
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

interface InvestorSignatureData {
  investor: Investor;
  signatureImage: string;
  signedAt: Date;
  ipAddress?: string;
  signatureHash: string;
}

interface GenerateAggregatedPDFOptions {
  template: AgreementTemplate;
  property: Property;
  signatures: InvestorSignatureData[];
  allInvestors: Investor[];
  language?: "en" | "ar"; // Language for PDF generation
}

/**
 * Generate aggregated PDF with all signatures and certificate pages
 * This creates ONE master PDF containing all signatures for a document type
 */
export async function generateAggregatedPDF(options: GenerateAggregatedPDFOptions): Promise<Uint8Array> {
  const { template, property, signatures, allInvestors, language = "en" } = options;

  if (signatures.length === 0) {
    throw new Error("No signatures provided for aggregated PDF");
  }

  const pdfDoc = await PDFDocument.create();
  
  // Embed fonts based on language
  let bodyFont;
  let headerFont;
  let detailFont;
  let boldFont;
  
  if (language === "ar") {
    // For Arabic, embed Noto Sans Arabic font
    const arabicBytes = await getArabicFont();
    const arabicFont = await pdfDoc.embedFont(arabicBytes);
    bodyFont = arabicFont;
    headerFont = arabicFont;
    detailFont = arabicFont;
    boldFont = arabicFont;
  } else {
    // For English, use standard fonts
    bodyFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    headerFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    detailFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const contentWidth = pageWidth - (margin * 2);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPosition = pageHeight - margin;

  // Document header
  page.drawText(shapeArabicText("FRACTIONAL OFF-PLAN DUBAI (FOPD)", language), {
    x: margin,
    y: yPosition,
    size: 16,
    font: headerFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;

  page.drawText(shapeArabicText(template.name, language), {
    x: margin,
    y: yPosition,
    size: 14,
    font: headerFont,
    color: rgb(0.2, 0.2, 0.2),
  });
  yPosition -= 20;

  page.drawText(shapeArabicText(`Multi-Party Agreement - ${signatures.length} Co-Owners`, language), {
    x: margin,
    y: yPosition,
    size: 10,
    font: detailFont,
    color: rgb(0.4, 0.4, 0.4),
  });
  yPosition -= 35;

  // Fill template with property and investor data
  const filledContent = fillTemplatePlaceholders(
    template.content,
    signatures[0].investor, // Primary investor for placeholders
    property,
    allInvestors,
    language
  );

  // Render content
  const paragraphs = filledContent.split('\n\n');
  const fontSize = 11;
  const lineHeight = fontSize * 1.4;

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) continue;

    const words = paragraph.split(' ');
    let line = '';

    for (const word of words) {
      const testLine = line + word + ' ';
      const testWidth = bodyFont.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > contentWidth && line.length > 0) {
        page.drawText(shapeArabicText(line.trim(), language), {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: bodyFont,
          color: rgb(0, 0, 0),
        });
        yPosition -= lineHeight;
        line = word + ' ';

        if (yPosition < margin + 100) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          yPosition = pageHeight - margin;
        }
      } else {
        line = testLine;
      }
    }

    if (line.trim()) {
      page.drawText(shapeArabicText(line.trim(), language), {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: bodyFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= lineHeight;
    }

    yPosition -= lineHeight * 0.5;

    if (yPosition < margin + 100) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPosition = pageHeight - margin;
    }
  }

  // Add signature summary section
  yPosition -= 30;
  if (yPosition < margin + 200) {
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;
  }

  page.drawText(shapeArabicText("ELECTRONICALLY SIGNED BY ALL PARTIES", language), {
    x: margin,
    y: yPosition,
    size: 12,
    font: headerFont,
    color: rgb(0, 0, 0),
  });
  yPosition -= 25;

  page.drawText(shapeArabicText(`This document has been electronically signed by ${signatures.length} parties.`, language), {
    x: margin,
    y: yPosition,
    size: 10,
    font: detailFont,
    color: rgb(0.3, 0.3, 0.3),
  });
  yPosition -= 20;

  page.drawText(shapeArabicText("See certificate pages following this document for complete signature details.", language), {
    x: margin,
    y: yPosition,
    size: 10,
    font: detailFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Add certificate page for each signer
  for (let i = 0; i < signatures.length; i++) {
    const sig = signatures[i];
    
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    yPosition = pageHeight - margin;

    // Certificate header
    page.drawText(shapeArabicText("SIGNATURE CERTIFICATE", language), {
      x: margin,
      y: yPosition,
      size: 18,
      font: headerFont,
      color: rgb(0, 0, 0),
    });
    yPosition -= 30;

    page.drawText(shapeArabicText(`Signer ${i + 1} of ${signatures.length}`, language), {
      x: margin,
      y: yPosition,
      size: 12,
      font: boldFont,
      color: rgb(0.2, 0.2, 0.2),
    });
    yPosition -= 40;

    // Signer information
    const infoItems = [
      { label: "Signer Name", value: sig.investor.fullName },
      { label: "Investor ID", value: sig.investor.id },
      { label: "Email Address", value: sig.investor.email },
      { label: "Phone Number", value: sig.investor.phone },
      { label: "Signature Timestamp", value: sig.signedAt.toISOString() },
      { label: "IP Address", value: sig.ipAddress || "N/A" },
      { label: "Signature Hash (SHA-256)", value: sig.signatureHash.substring(0, 64) + "..." },
    ];

    for (const item of infoItems) {
      page.drawText(shapeArabicText(item.label + ":", language), {
        x: margin,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 15;

      page.drawText(shapeArabicText(item.value, language), {
        x: margin + 20,
        y: yPosition,
        size: 10,
        font: detailFont,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 25;
    }

    yPosition -= 20;

    // Embed signature image
    try {
      const base64Data = sig.signatureImage.replace(/^data:image\/png;base64,/, '');
      const signatureImageBytes = Buffer.from(base64Data, 'base64');
      const signatureImg = await pdfDoc.embedPng(signatureImageBytes);
      
      const signatureWidth = 250;
      const signatureHeight = 100;

      page.drawText(shapeArabicText("Digital Signature:", language), {
        x: margin,
        y: yPosition,
        size: 10,
        font: boldFont,
        color: rgb(0, 0, 0),
      });
      yPosition -= 120;
      
      page.drawImage(signatureImg, {
        x: margin,
        y: yPosition,
        width: signatureWidth,
        height: signatureHeight,
      });
      yPosition -= 30;
    } catch (error) {
      console.error("Failed to embed signature image:", error);
      page.drawText(shapeArabicText("[Digital Signature - Image Unavailable]", language), {
        x: margin,
        y: yPosition,
        size: 10,
        font: detailFont,
        color: rgb(0.5, 0.5, 0.5),
      });
      yPosition -= 40;
    }

    // Certificate footer
    yPosition -= 20;
    page.drawText(shapeArabicText("This certificate verifies the authenticity of the electronic signature.", language), {
      x: margin,
      y: yPosition,
      size: 9,
      font: detailFont,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  // Add footer to all pages
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    const footerY = 30;
    page.drawText(shapeArabicText(`Document ID: ${template.id} | Version ${template.version}`, language), {
      x: margin,
      y: footerY,
      size: 8,
      font: detailFont,
      color: rgb(0.6, 0.6, 0.6),
    });
    
    page.drawText(shapeArabicText(`Page ${index + 1} of ${pages.length}`, language), {
      x: pageWidth - margin - 60,
      y: footerY,
      size: 8,
      font: detailFont,
      color: rgb(0.6, 0.6, 0.6),
    });
  });

  return await pdfDoc.save();
}
