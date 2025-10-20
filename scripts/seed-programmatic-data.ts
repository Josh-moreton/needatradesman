/**
 * Seed script for programmatic pages test data
 * Run with: npx tsx scripts/seed-programmatic-data.ts
 */

import { PrismaClient, JobCategory } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding programmatic pages data...");

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
