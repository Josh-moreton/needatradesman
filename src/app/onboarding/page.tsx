import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

interface ClerkMetadata {
  onboardingComplete?: boolean;
  role?: string;
}

export default async function OnboardingPage() {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      // User not authenticated, redirect to sign-in
      redirect("/sign-in");
    }

    // Check session metadata for onboarding completion
    const metadata = sessionClaims?.publicMetadata as ClerkMetadata;
    const onboardingComplete = metadata?.onboardingComplete;
    const userRole = metadata?.role;

    if (onboardingComplete && userRole) {
      // User already completed onboarding according to session metadata
      if (userRole === "CUSTOMER") {
        redirect("/customer");
      } else if (userRole === "TRADESPERSON") {
        redirect("/tradesperson");
      }
    }

    // Check if user exists in our database and already has a role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (user && user.role) {
      // User exists in database with a role but onboarding metadata might be missing/out of sync
      if (!onboardingComplete) {
        // Try to sync the metadata
        try {
          const client = await clerkClient();
          await client.users.updateUserMetadata(userId, {
            publicMetadata: {
              onboardingComplete: true,
              role: user.role,
            },
          });
          console.log("Synced missing onboarding metadata for user:", userId);
        } catch (syncError) {
          console.error("Error syncing metadata:", syncError);
        }
      }

      // Redirect to appropriate dashboard
      if (user.role === "CUSTOMER") {
        redirect("/customer");
      } else if (user.role === "TRADESPERSON") {
        redirect("/tradesperson");
      }
    }

    // User needs onboarding, show the flow
    return <OnboardingFlow />;
  } catch (error) {
    console.error("Error in onboarding page:", error);
    redirect("/sign-in");
  }
}
