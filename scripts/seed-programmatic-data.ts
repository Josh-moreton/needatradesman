/**
 * Seed script for programmatic pages test data
 * Run with: npx tsx scripts/seed-programmatic-data.ts
 */

import { PrismaClient, JobCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding programmatic pages data...");

  // Seed pricing quartiles
  console.log("  📊 Creating pricing quartiles...");
  const pricingData = [
    // London data
    {
      trade: JobCategory.ELECTRICAL,
      location: "London",
      locationType: "city",
      q1: 150.0,
      q2: 250.0,
      q3: 400.0,
      unit: "job",
      sampleSize: 120,
    },
    {
      trade: JobCategory.PLUMBING,
      location: "London",
      locationType: "city",
      q1: 100.0,
      q2: 200.0,
      q3: 350.0,
      unit: "job",
      sampleSize: 95,
    },
    // Edinburgh data
    {
      trade: JobCategory.ELECTRICAL,
      location: "Edinburgh",
      locationType: "city",
      q1: 120.0,
      q2: 200.0,
      q3: 320.0,
      unit: "job",
      sampleSize: 45,
    },
    {
      trade: JobCategory.PLUMBING,
      location: "Edinburgh",
      locationType: "city",
      q1: 90.0,
      q2: 170.0,
      q3: 280.0,
      unit: "job",
      sampleSize: 38,
    },
    // Manchester
    {
      trade: JobCategory.CARPENTRY,
      location: "Manchester",
      locationType: "city",
      q1: 180.0,
      q2: 300.0,
      q3: 500.0,
      unit: "job",
      sampleSize: 52,
    },
  ];

  for (const pricing of pricingData) {
    await prisma.pricingQuartile.upsert({
      where: {
        trade_location_locationType: {
          trade: pricing.trade,
          location: pricing.location,
          locationType: pricing.locationType,
        },
      },
      update: pricing,
      create: pricing,
    });
  }
  console.log(`  ✅ Created ${pricingData.length} pricing quartiles`);

  // Seed local rules
  console.log("  📜 Creating local rules...");
  const localRules = [
    // Electrical - UK-wide
    {
      trade: JobCategory.ELECTRICAL,
      location: "UK",
      ruleType: "regulation",
      title: "Part P Building Regulations",
      description:
        "All electrical work in kitchens, bathrooms, and outdoor areas must comply with Part P of the Building Regulations. Only qualified electricians should perform this work.",
      reference: "https://www.gov.uk/building-regulations-approval",
      isActive: true,
      priority: 10,
    },
    {
      trade: JobCategory.ELECTRICAL,
      location: "UK",
      ruleType: "safety",
      title: "Registered Electrician Required",
      description:
        "Ensure your electrician is registered with a competent person scheme such as NICEIC, ELECSA, or NAPIT.",
      reference: "https://www.gov.uk/electrical-safety-standards",
      isActive: true,
      priority: 9,
    },
    // Plumbing - UK-wide
    {
      trade: JobCategory.PLUMBING,
      location: "UK",
      ruleType: "regulation",
      title: "Gas Safe Registration",
      description:
        "Any plumber working on gas appliances must be Gas Safe registered. Check their registration number before work begins.",
      reference: "https://www.gassaferegister.co.uk",
      isActive: true,
      priority: 10,
    },
    // London-specific
    {
      trade: JobCategory.ELECTRICAL,
      location: "London",
      ruleType: "regulation",
      title: "London Building Control",
      description:
        "Electrical work in London requires notification to your local building control authority or certification from a registered electrician.",
      reference: null,
      isActive: true,
      priority: 5,
    },
    // Carpentry
    {
      trade: JobCategory.CARPENTRY,
      location: "UK",
      ruleType: "safety",
      title: "FENSA Registration for Windows",
      description:
        "If installing or replacing windows, ensure the installer is FENSA registered for compliance with building regulations.",
      reference: "https://www.fensa.org.uk",
      isActive: true,
      priority: 8,
    },
  ];

  for (const rule of localRules) {
    await prisma.localRule.create({
      data: rule,
    });
  }
  console.log(`  ✅ Created ${localRules.length} local rules`);

  // Note: Providers, availability, and reviews would typically be created through the app
  // For now, we'll just seed the data needed for basic page rendering

  console.log("✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Error seeding data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
