import { redirect } from "next/navigation";
import { auth } from "@/auth";
import LandingPage from "@/components/landing/LandingPage";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await auth();

  // If not signed in, show the marketing/landing page
  if (!session?.user) return <LandingPage />;

  // If signed in, always route to dashboard; onboarding gating happens there
  redirect("/dashboard");
}
