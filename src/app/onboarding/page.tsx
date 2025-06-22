import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      // User not authenticated, redirect to sign-in
      redirect("/sign-in");
    }

    // Check if user exists in our database and already has a role
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (user && user.role) {
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
