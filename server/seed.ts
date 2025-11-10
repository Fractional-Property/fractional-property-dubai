import { db } from "../db";
import { properties } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");

  const existingProperty = await db.select().from(properties).where(() => properties.isPilot);
  
  if (existingProperty.length === 0) {
    await db.insert(properties).values({
      title: "1BR JVC Apartment",
      location: "Jumeirah Village Circle, Dubai",
      totalPrice: "900000",
      pricePerFraction: "90000",
      totalFractions: 10,
      fractionsSold: 7,
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

  console.log("Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
