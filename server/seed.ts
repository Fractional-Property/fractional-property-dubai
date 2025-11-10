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

This Co-Ownership Agreement ("Agreement") is entered into as of {{DATE}} between the undersigned co-owners ("Co-Owners") for the fractional ownership of the property located at {{PROPERTY_ADDRESS}}, Dubai, United Arab Emirates.

PROPERTY DETAILS:
- Property: {{PROPERTY_TITLE}}
- Location: {{PROPERTY_LOCATION}}
- Total Property Value: AED {{TOTAL_PRICE}}
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
All purchase payments are held in the developer's DLD-registered escrow account (IBAN: {{ESCROW_IBAN}}) until property completion.

GOVERNING LAW:
This Agreement is governed by the laws of the United Arab Emirates and Dubai Land Department regulations.

CO-OWNER DETAILS:

{{CO_OWNER_1_NAME}}
Share: 25%
Email: {{CO_OWNER_1_EMAIL}}
Signature: _____________________
Date: _____________________

{{CO_OWNER_2_NAME}}
Share: 25%
Email: {{CO_OWNER_2_EMAIL}}
Signature: _____________________
Date: _____________________

{{CO_OWNER_3_NAME}}
Share: 25%
Email: {{CO_OWNER_3_EMAIL}}
Signature: _____________________
Date: _____________________

{{CO_OWNER_4_NAME}}
Share: 25%
Email: {{CO_OWNER_4_EMAIL}}
Signature: _____________________
Date: _____________________

This agreement complies with Dubai Law No. 6/2019 regarding joint property ownership.`;

    const powerOfAttorneyContent = `IRREVOCABLE POWER OF ATTORNEY

I, {{INVESTOR_NAME}}, holder of passport number {{PASSPORT_NUMBER}}, hereby grant irrevocable Power of Attorney to FOPD Management LLC to act on my behalf for all matters related to the fractional ownership of:

Property: {{PROPERTY_TITLE}}
Location: {{PROPERTY_LOCATION}}
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
Name: {{INVESTOR_NAME}}
Passport: {{PASSPORT_NUMBER}}
Email: {{INVESTOR_EMAIL}}
Phone: {{INVESTOR_PHONE}}

Signature: _____________________
Date: _____________________

WITNESS:
Name: _____________________
Signature: _____________________
Date: _____________________

Notarized by: _____________________`;

    const coOwnershipHash = crypto.createHash('sha256').update(coOwnershipContent).digest('hex');
    const poaHash = crypto.createHash('sha256').update(powerOfAttorneyContent).digest('hex');

    await db.insert(agreementTemplates).values([
      {
        name: "Co-Ownership Agreement",
        templateType: "co_ownership",
        content: coOwnershipContent,
        contentHash: coOwnershipHash,
        version: 1,
        isActive: true,
      },
      {
        name: "Irrevocable Power of Attorney",
        templateType: "power_of_attorney",
        content: powerOfAttorneyContent,
        contentHash: poaHash,
        version: 1,
        isActive: true,
      },
    ]);
    console.log("✓ Agreement templates created");
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
