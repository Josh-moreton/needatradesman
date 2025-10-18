import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import QuoteTemplatesClient from "@/components/quotes/QuoteTemplatesClient";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const dynamic = "force-dynamic";

export default async function DashboardQuoteTemplatesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
    return;
  }

  // The layout handles the onboarding flow if user.role is null
  // If we reach here, user has a role (layout ensures this)

  // Only tradespeople should see this page
  if (user.role !== UserRole.TRADESPERSON) {
    redirect("/dashboard");
    return;
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-background">
      <h1 className="text-3xl font-bold mb-6">Manage Quote Templates</h1>
      <ErrorBoundary>
        <QuoteTemplatesClient />
      </ErrorBoundary>
    </div>
  );
}
