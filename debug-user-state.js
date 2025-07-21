// Run this with: node debug-user-state.js
// This will help debug the user state mismatch

const { PrismaClient } = require("@prisma/client");
const { clerkClient } = require("@clerk/nextjs/server");

const prisma = new PrismaClient();

async function debugUserState() {
  try {
    // Get all users from database
    const dbUsers = await prisma.user.findMany({
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        trades: true,
      },
    });

    console.log(`Found ${dbUsers.length} users in database:`);

    for (const dbUser of dbUsers) {
      console.log(`\n--- User ${dbUser.email} ---`);
      console.log("Database:", {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        role: dbUser.role,
        trades: dbUser.trades,
      });

      try {
        // Get corresponding Clerk user
        const client = clerkClient();
        const clerkUser = await client.users.getUser(dbUser.clerkId);

        console.log("Clerk metadata:", {
          onboardingComplete: clerkUser.publicMetadata?.onboardingComplete,
          role: clerkUser.publicMetadata?.role,
        });

        // Check for mismatches
        const dbHasRole = !!dbUser.role;
        const clerkHasOnboarding =
          !!clerkUser.publicMetadata?.onboardingComplete;
        const rolesMatch = dbUser.role === clerkUser.publicMetadata?.role;

        if (dbHasRole && !clerkHasOnboarding) {
          console.log(
            "❌ ISSUE: User has role in DB but missing onboardingComplete in Clerk"
          );
        }
        if (!rolesMatch) {
          console.log("❌ ISSUE: Role mismatch between DB and Clerk");
        }
        if (dbHasRole && clerkHasOnboarding && rolesMatch) {
          console.log("✅ User state is consistent");
        }
      } catch (clerkError) {
        console.log("❌ Error fetching Clerk user:", clerkError.message);
      }
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUserState();
