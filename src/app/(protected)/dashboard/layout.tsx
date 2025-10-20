import { getAuthGate } from "@/lib/auth-gate";
import { UserRole } from "@prisma/client";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await getAuthGate();

  // Authentication check (should be handled by middleware, but defensive)
  if (!gate) {
    // User is authenticated with Clerk but doesn't exist in our DB yet
    // This happens when webhooks aren't configured - show onboarding to create user
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1">
          <OnboardingFlow />
        </main>
      </div>
    );
  }

  // If user needs onboarding, show onboarding flow
  if (gate.role === UserRole.PENDING) {
    return (
      <div className="flex min-h-screen bg-background">
        <main className="flex-1">
          <OnboardingFlow />
        </main>
      </div>
    );
  }

  // User is authenticated and has completed onboarding - render dashboard content
  // Header component (in root layout) handles all navigation
  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 w-full">{children}</main>
    </div>
  );
}
