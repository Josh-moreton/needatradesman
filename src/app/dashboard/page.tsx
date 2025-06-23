import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/schemas";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

/**
 * Dashboard Router - Simple role-based routing with no UI
 * Redirects users to their appropriate dashboard based on role
 */
export default async function DashboardRouter() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      // User not authenticated or not in database
      redirect("/sign-in");
    }

    if (!user.role) {
      // User exists but needs to complete onboarding
      redirect("/onboarding");
    }

    // Route users to their appropriate dashboard
    if (user.role === UserRole.CUSTOMER) {
      redirect("/customer");
    }

    if (user.role === UserRole.TRADESPERSON) {
      redirect("/tradesperson");
    }

    // Fallback - should not reach here but safety first
    redirect("/onboarding");
  } catch (error) {
    console.error("Error in dashboard router:", error);
    redirect("/sign-in");
  }
}
