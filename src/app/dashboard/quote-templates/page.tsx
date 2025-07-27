import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuoteTemplatesClient from "@/components/quotes/QuoteTemplatesClient";

export default async function DashboardQuoteTemplatesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
    return;
  }

  if (!user.role) {
    redirect("/onboarding");
    return;
  }

  // Only tradespeople should see this page
  if (user.role !== UserRole.TRADESPERSON) {
    redirect("/dashboard");
    return;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Manage Quote Templates</h1>
      <QuoteTemplatesClient userId={user.id} />
    </div>
  );
}
