import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { createLogger } from '@/lib/logger';

const logger = createLogger('onboarding-page');

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

    if (user && user.role && onboardingComplete) {
      // User already completed onboarding, redirect to appropriate dashboard
      if (user.role === "CUSTOMER") {
        redirect("/customer");
      } else if (user.role === "TRADESPERSON") {
        redirect("/tradesperson");
      }
    }

    // User needs onboarding, show the flow
    return <OnboardingFlow />;
  } catch (error) {
    logger.error({ error }, "Error in onboarding page");
    redirect("/sign-in");
  }
}
