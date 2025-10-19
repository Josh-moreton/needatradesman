import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { SidebarCustomer } from "@/components/layout/SidebarCustomer";
import { SidebarTradesperson } from "@/components/layout/SidebarTradesperson";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Authentication check (should be handled by middleware, but defensive)
  if (!user) {
    // User is authenticated with Clerk but doesn't exist in our DB yet
    // This happens when webhooks aren't configured - show onboarding to create user
    return (
      <div className="flex h-screen bg-background">
        <main className="flex-1 overflow-y-auto">
          <OnboardingFlow />
        </main>
      </div>
    );
  }

  // Route based on role - clean state machine pattern
  switch (user.role) {
    case UserRole.PENDING:
      // User needs to complete onboarding
      return (
        <div className="flex h-screen bg-background">
          <main className="flex-1 overflow-y-auto">
            <OnboardingFlow />
          </main>
        </div>
      );

    case UserRole.CUSTOMER:
      // Customer dashboard with sidebar
      return (
        <div className="flex h-screen bg-background">
          <SidebarCustomer user={user} />
          <main className="flex-1 overflow-y-auto bg-background pt-14 md:pt-0">{children}</main>
        </div>
      );

    case UserRole.TRADESPERSON:
      // Tradesperson dashboard with sidebar
      return (
        <div className="flex h-screen bg-background">
          <SidebarTradesperson user={user} />
          <main className="flex-1 overflow-y-auto bg-background pt-14 md:pt-0">{children}</main>
        </div>
      );

    default:
      // Invalid role - should never happen, but defensive
      redirect("/sign-in");
  }
}
