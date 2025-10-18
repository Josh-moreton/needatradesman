import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

// We intentionally avoid using Clerk session metadata for gating to prevent mismatches.

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    // User not authenticated, redirect to sign-in
    redirect("/sign-in");
  }

  // Check if user exists in our database and already has a role
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (user && user.role) {
    // Onboarding complete according to our DB; always go to dashboard
    redirect("/dashboard");
  }

  // User needs onboarding, show the flow
  return <OnboardingFlow />;
}
