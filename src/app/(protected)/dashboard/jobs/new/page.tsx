import { getAuthGate } from "@/lib/auth-gate";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { JobForm } from "@/components/jobs/JobForm";

export default async function DashboardNewJobPage() {
  const gate = await getAuthGate();

  if (!gate) {
    redirect("/sign-in");
    return;
  }

  // The layout handles the onboarding flow if gate.role is null
  // If we reach here, user has a role (layout ensures this)

  // Only customers should see this page
  if (gate.role !== UserRole.CUSTOMER) {
    redirect("/dashboard");
    return;
  }

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Post a New Job</h1>
          <p className="text-muted-foreground mt-2">
            Create a job posting to find qualified tradespeople
          </p>
        </div>
        <JobForm />
      </div>
    </div>
  );
}
