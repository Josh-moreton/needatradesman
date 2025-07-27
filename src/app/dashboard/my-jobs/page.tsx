import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobCard } from "@/components/jobs/JobCard";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardMyJobsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
    return;
  }

  if (!user.role) {
    redirect("/onboarding");
    return;
  }

  // Only customers should see this page
  if (user.role !== UserRole.CUSTOMER) {
    redirect("/dashboard");
    return;
  }

  // Get customer's jobs
  const jobs = await prisma.job.findMany({
    where: { customerId: user.id },
    include: {
      _count: {
        select: { applications: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Jobs</h1>
          <p className="text-muted-foreground">
            Manage your job postings and view applications
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/jobs/new">
            <PlusCircle className="h-4 w-4 mr-2" />
            Post New Job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">
            You haven't posted any jobs yet
          </p>
          <Button asChild>
            <Link href="/dashboard/jobs/new">
              <PlusCircle className="h-4 w-4 mr-2" />
              Post Your First Job
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} variant="customer" />
          ))}
        </div>
      )}
    </div>
  );
}
