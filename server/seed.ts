import { db } from "../db";
import { properties, agreementTemplates } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function seed() {
  console.log("Seeding database...");

  const existingProperty = await db.select().from(properties).where(eq(properties.isPilot, true));
  
  if (existingProperty.length === 0) {
    await db.insert(properties).values({
      title: "1BR JVC Apartment",
      location: "Jumeirah Village Circle, Dubai",
      totalPrice: "900000",
      pricePerFraction: "225000",
      totalFractions: 4,
      fractionsSold: 3,
      description: "Modern 1-bedroom apartment in the heart of Jumeirah Village Circle. Perfect for investors looking to enter the Dubai real estate market with fractional ownership.",
      bedrooms: 1,
      bathrooms: 1,
      area: 650,
      isPilot: true,
      escrowIban: "AE07 0331 2345 6789 0123 456",
    });
    console.log("✓ Pilot property created");
  } else {
    console.log("✓ Pilot property already exists");
  }

  const existingTemplates = await db.select().from(agreementTemplates);
  
  if (existingTemplates.length === 0) {
    const coOwnershipContent = `CO-OWNERSHIP AGREEMENT

This Co-Ownership Agreement ("Agreement") is entered into as of {CURRENT_DATE} between the undersigned co-owners ("Co-Owners") for the fractional ownership of the property located at {PROPERTY_LOCATION}, Dubai, United Arab Emirates.

PROPERTY DETAILS:
- Property: {PROPERTY_TITLE}
- Location: {PROPERTY_LOCATION}
- Total Property Value: AED {PROPERTY_PRICE}
- Total Co-Owners: 4 (maximum as per DLD Law No. 6/2019)

CO-OWNERSHIP STRUCTURE:
Each Co-Owner shall own an undivided 25% share of the property. This is direct real estate co-ownership registered with the Dubai Land Department (DLD), not a security or investment product regulated by DFSA.

RIGHTS AND RESPONSIBILITIES:
1. Each Co-Owner has an equal undivided 25% interest in the property
2. All Co-Owners share equally in rental income, expenses, and profits from sale
3. Decisions regarding the property require majority consent (3 of 4 co-owners)
4. Each Co-Owner is jointly and severally liable for property-related obligations
5. Transfer of ownership requires consent of other co-owners and DLD registration

ESCROW AND PAYMENTS:
All purchase payments are held in the developer's DLD-registered escrow account until property completion.

GOVERNING LAW:
This Agreement is governed by the laws of the United Arab Emirates and Dubai Land Department regulations.

This agreement complies with Dubai Law No. 6/2019 regarding joint property ownership.`;

    const coOwnershipContentArabic = `اتفاقية الملكية المشتركة

يتم الدخول في اتفاقية الملكية المشتركة هذه ("الاتفاقية") بتاريخ {CURRENT_DATE} بين المالكين المشتركين الموقعين أدناه ("المالكون المشتركون") للملكية الجزئية للعقار الواقع في {PROPERTY_LOCATION}، دبي، الإمارات العربية المتحدة.

تفاصيل العقار:
- العقار: {PROPERTY_TITLE}
- الموقع: {PROPERTY_LOCATION}
- القيمة الإجمالية للعقار: {PROPERTY_PRICE} درهم
- إجمالي المالكين المشتركين: ٤ (الحد الأقصى وفقاً لقانون دبي رقم ٦/٢٠١٩)

هيكل الملكية المشتركة:
يمتلك كل مالك مشترك حصة غير مجزأة بنسبة ٢٥٪ من العقار. هذه ملكية عقارية مشتركة مباشرة مسجلة لدى دائرة الأراضي والأملاك في دبي، وليست ورقة مالية أو منتج استثماري منظم من قبل هيئة الأوراق المالية والسلع.

الحقوق والمسؤوليات:
١. لكل مالك مشترك مصلحة متساوية غير مجزأة بنسبة ٢٥٪ في العقار
٢. يتقاسم جميع المالكين المشتركين بالتساوي الدخل الإيجاري والنفقات والأرباح من البيع
٣. تتطلب القرارات المتعلقة بالعقار موافقة الأغلبية (٣ من ٤ مالكين مشتركين)
٤. كل مالك مشترك مسؤول بالتضامن والتكافل عن الالتزامات المتعلقة بالعقار
٥. يتطلب نقل الملكية موافقة المالكين المشتركين الآخرين والتسجيل لدى دائرة الأراضي والأملاك

الضمان والمدفوعات:
يتم الاحتفاظ بجميع مدفوعات الشراء في حساب الضمان المسجل لدى دائرة الأراضي والأملاك للمطور حتى اكتمال العقار.

القانون الحاكم:
تخضع هذه الاتفاقية لقوانين دولة الإمارات العربية المتحدة ولوائح دائرة الأراضي والأملاك في دبي.

تمتثل هذه الاتفاقية لقانون دبي رقم ٦/٢٠١٩ بشأن الملكية العقارية المشتركة.`;

    const powerOfAttorneyContent = `IRREVOCABLE POWER OF ATTORNEY

I, {INVESTOR_NAME}, holder of passport number {PASSPORT_NUMBER}, hereby grant irrevocable Power of Attorney to FOPD Management LLC to act on my behalf for all matters related to the fractional ownership of:

Property: {PROPERTY_TITLE}
Location: {PROPERTY_LOCATION}
My Share: 25% undivided interest

SCOPE OF AUTHORITY:
The Attorney-in-Fact is authorized to:
1. Sign all documents required for DLD title deed registration
2. Receive rental income and manage property operations
3. Execute sale agreements upon my written consent
4. Handle property maintenance and management decisions
5. Communicate with developers, DLD, and other co-owners on my behalf
6. Open and operate bank accounts for property-related transactions

LIMITATIONS:
- Cannot sell or transfer my ownership without my explicit written consent
- Cannot mortgage or encumber my share without my written authorization
- Must provide quarterly financial statements regarding the property
- Must obtain majority co-owner consent for decisions exceeding AED 50,000

TERM:
This Power of Attorney remains in effect until property sale or my written revocation, subject to 90 days' notice.

GOVERNING LAW:
This Power of Attorney is governed by UAE Federal Law No. 11 of 1992 (Civil Transactions Law) and DLD regulations.

PRINCIPAL DETAILS:
Name: {INVESTOR_NAME}
Passport: {PASSPORT_NUMBER}
Email: {INVESTOR_EMAIL}
Phone: {INVESTOR_PHONE}`;

    const powerOfAttorneyContentArabic = `توكيل غير قابل للإلغاء

أنا، {INVESTOR_NAME}، حامل جواز السفر رقم {PASSPORT_NUMBER}، أمنح بموجب هذا توكيلاً غير قابل للإلغاء لشركة FOPD Management LLC للعمل نيابة عني في جميع الأمور المتعلقة بالملكية الجزئية لـ:

العقار: {PROPERTY_TITLE}
الموقع: {PROPERTY_LOCATION}
حصتي: ٢٥٪ حصة غير مجزأة

نطاق السلطة:
الوكيل مخول بـ:
١. توقيع جميع المستندات المطلوبة لتسجيل سند الملكية في دائرة الأراضي والأملاك
٢. استلام الدخل الإيجاري وإدارة عمليات العقار
٣. تنفيذ اتفاقيات البيع بموافقتي الخطية
٤. التعامل مع قرارات صيانة وإدارة العقار
٥. التواصل مع المطورين ودائرة الأراضي والأملاك والمالكين المشتركين الآخرين نيابة عني
٦. فتح وتشغيل حسابات بنكية للمعاملات المتعلقة بالعقار

القيود:
- لا يمكن بيع أو نقل ملكيتي دون موافقتي الخطية الصريحة
- لا يمكن رهن أو تحميل حصتي دون إذني الخطي
- يجب تقديم بيانات مالية ربع سنوية بخصوص العقار
- يجب الحصول على موافقة أغلبية المالكين المشتركين للقرارات التي تتجاوز ٥٠,٠٠٠ درهم

المدة:
يظل هذا التوكيل ساري المفعول حتى بيع العقار أو إلغائي الخطي، مع مراعاة إشعار مدته ٩٠ يوماً.

القانون الحاكم:
يخضع هذا التوكيل للقانون الاتحادي رقم ١١ لسنة ١٩٩٢ (قانون المعاملات المدنية) ولوائح دائرة الأراضي والأملاك.

تفاصيل الموكل:
الاسم: {INVESTOR_NAME}
جواز السفر: {PASSPORT_NUMBER}
البريد الإلكتروني: {INVESTOR_EMAIL}
الهاتف: {INVESTOR_PHONE}`;

    const jopDeclarationContent = `JOINT OWNERSHIP PROPERTY (JOP) DECLARATION

This JOP Declaration is prepared in accordance with Dubai Land Department Article 6 regulations for multi-party property ownership in Dubai, United Arab Emirates.

PROPERTY INFORMATION:
Property: {PROPERTY_TITLE}
Location: {PROPERTY_LOCATION}
Total Value: {PROPERTY_PRICE}

CO-OWNERS DECLARATION:
We, the undersigned co-owners, hereby declare our joint ownership of the above-mentioned property with equal 25% shares each, in compliance with DLD Law No. 6/2019.

Each co-owner acknowledges and agrees to the terms of the Co-Ownership Agreement and Power of Attorney executed concurrently with this declaration.

This declaration is submitted to Dubai Land Department for official registration and title deed issuance.

Executed on: {CURRENT_DATE}`;

    const jopDeclarationContentArabic = `إقرار الملكية المشتركة (JOP)

يُعد إقرار الملكية المشتركة هذا وفقاً للمادة ٦ من لوائح دائرة الأراضي والأملاك في دبي للملكية العقارية متعددة الأطراف في دبي، الإمارات العربية المتحدة.

معلومات العقار:
العقار: {PROPERTY_TITLE}
الموقع: {PROPERTY_LOCATION}
القيمة الإجمالية: {PROPERTY_PRICE}

إقرار المالكين المشتركين:
نحن، المالكون المشتركون الموقعون أدناه، نقر بملكيتنا المشتركة للعقار المذكور أعلاه بحصص متساوية ٢٥٪ لكل منا، وفقاً لقانون دبي رقم ٦/٢٠١٩.

يقر ويوافق كل مالك مشترك على شروط اتفاقية الملكية المشتركة والتوكيل المنفذة بالتزامن مع هذا الإقرار.

يتم تقديم هذا الإقرار إلى دائرة الأراضي والأملاك في دبي للتسجيل الرسمي وإصدار سند الملكية.

نُفذ بتاريخ: {CURRENT_DATE}`;

    const coOwnershipHash = crypto.createHash('sha256').update(coOwnershipContent).digest('hex');
    const coOwnershipHashArabic = crypto.createHash('sha256').update(coOwnershipContentArabic).digest('hex');
    const poaHash = crypto.createHash('sha256').update(powerOfAttorneyContent).digest('hex');
    const poaHashArabic = crypto.createHash('sha256').update(powerOfAttorneyContentArabic).digest('hex');
    const jopHash = crypto.createHash('sha256').update(jopDeclarationContent).digest('hex');
    const jopHashArabic = crypto.createHash('sha256').update(jopDeclarationContentArabic).digest('hex');

    await db.insert(agreementTemplates).values([
      {
        name: "Co-Ownership Agreement",
        templateType: "co_ownership",
        content: coOwnershipContent,
        contentHash: coOwnershipHash,
        contentArabic: coOwnershipContentArabic,
        contentHashArabic: coOwnershipHashArabic,
        version: 1,
        isActive: true,
      },
      {
        name: "Irrevocable Power of Attorney",
        templateType: "power_of_attorney",
        content: powerOfAttorneyContent,
        contentHash: poaHash,
        contentArabic: powerOfAttorneyContentArabic,
        contentHashArabic: poaHashArabic,
        version: 1,
        isActive: true,
      },
      {
        name: "JOP Declaration (DLD Article 6)",
        templateType: "jop_declaration",
        content: jopDeclarationContent,
        contentHash: jopHash,
        contentArabic: jopDeclarationContentArabic,
        contentHashArabic: jopHashArabic,
        version: 1,
        isActive: true,
      },
    ]);
    console.log("✓ Agreement templates created (English and Arabic)");
  } else {
    console.log("✓ Agreement templates already exist");
  }

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
