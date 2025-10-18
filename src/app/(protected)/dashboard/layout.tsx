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

  // Authentication check
  if (!user) {
    redirect("/sign-in");
    return;
  }

  // If no role, show onboarding flow instead of sidebar + content
  if (!user.role) {
    return (
      <div className="flex h-screen bg-background">
        <main className="flex-1 overflow-y-auto">
          <OnboardingFlow />
        </main>
      </div>
    );
  }

  // Validate role is one of the expected values
  if (user.role !== UserRole.CUSTOMER && user.role !== UserRole.TRADESPERSON) {
    return (
      <div className="flex h-screen bg-background">
        <main className="flex-1 overflow-y-auto">
          <OnboardingFlow />
        </main>
      </div>
    );
  }

  // User has role, show full dashboard
  const SidebarComponent =
    user.role === UserRole.CUSTOMER ? SidebarCustomer : SidebarTradesperson;

  return (
    <div className="flex h-screen bg-background">
      <SidebarComponent user={user} />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
