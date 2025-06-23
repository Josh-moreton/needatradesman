import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import LandingPage from "@/components/landing/LandingPage";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    // First check auth state
    const { userId } = await auth();

    if (!userId) {
      // No auth token, show landing page
      return <LandingPage />;
    }

    // Get full user details
    const clerkUser = await currentUser();

    if (!clerkUser) {
      // Auth token exists but can't get user details, show landing page
      return <LandingPage />;
    }

    // Check if user exists in our database
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user) {
      // User authenticated but not in our DB, needs onboarding
      redirect("/onboarding");
    }

    if (!user.role) {
      // User exists but has no role, needs onboarding
      redirect("/onboarding");
    }

    // User is fully authenticated and has a role, redirect to their role-specific page
    if (user.role === "CUSTOMER") {
      redirect("/customer");
    } else if (user.role === "TRADESPERSON") {
      redirect("/tradesperson");
    } else {
      // Fallback if role is set but not recognized
      redirect("/onboarding");
    }
  } catch (error) {
    console.error("Error in home page:", error);
    // On any error, show landing page to prevent infinite loops
    return <LandingPage />;
  }
}
