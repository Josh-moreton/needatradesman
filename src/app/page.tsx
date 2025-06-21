import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { LandingPage } from "@/components/landing/LandingPage";

export default async function Home() {
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
}
