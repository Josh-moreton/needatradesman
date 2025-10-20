import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import LandingPage from "@/components/landing/LandingPage";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();

  // If not signed in, show the marketing/landing page
  if (!userId) return <LandingPage />;

  // If signed in, always route to dashboard; onboarding gating happens there
  redirect("/dashboard");
}
