import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import LandingPage from "@/components/landing/LandingPage";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function Home() {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      // Show landing page for unauthenticated users
      return <LandingPage />;
    }

    // Check if user exists in our database
    const user = await prisma.user.findUnique({
      where: { clerkId: clerkUser.id },
    });

    if (!user || !user.role) {
      // User needs onboarding
      redirect("/onboarding");
    }

    // User has a role, redirect to dashboard
    redirect("/dashboard");
  } catch (error) {
    console.error("Error in home page:", error);
    // Fallback to landing page on error
    return <LandingPage />;
  }
}
