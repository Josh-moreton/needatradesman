import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/schemas";
import { JobForm } from "@/components/jobs/JobForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect("/sign-in");
    }

    if (!user.role) {
      redirect("/onboarding");
    }

    if (user.role !== UserRole.CUSTOMER) {
      redirect("/dashboard");
    }

    return (
      <DashboardLayout userRole={user.role}>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Post a New Job</CardTitle>
              <CardDescription>
                Tell us about the work you need done and connect with qualified
                tradespeople in your area.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JobForm />
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Error in new job page:", error);
    redirect("/sign-in");
  }
}
