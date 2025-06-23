import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

interface ClerkMetadata {
  onboardingComplete?: boolean;
}

export default async function OnboardingPage() {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) {
      // User not authenticated, redirect to sign-in
      redirect("/sign-in");
    }

    // Check session metadata for onboarding completion
    const onboardingComplete = (sessionClaims?.metadata as ClerkMetadata)?.onboardingComplete;
    
    if (onboardingComplete) {
      // User already completed onboarding according to session metadata
      redirect("/dashboard");
    }

    // Check if user exists in our database and already has a role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (user && user.role && onboardingComplete) {
      // User already completed onboarding, redirect to dashboard
      redirect("/dashboard");
    }

    // User needs onboarding, show the flow
    return <OnboardingFlow />;
  } catch (error) {
    console.error("Error in onboarding page:", error);
    redirect("/sign-in");
  }
}
