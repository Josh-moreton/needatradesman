import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Dashboard from "@/components/dashboard/Dashboard";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

    return (
      <DashboardLayout>
        <Dashboard user={user} />
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Error in dashboard:", error);
    redirect("/sign-in");
  }
}
