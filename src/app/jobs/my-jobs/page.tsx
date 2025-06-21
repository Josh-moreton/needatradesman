import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JobCard } from "@/components/jobs/JobCard";
import Link from "next/link";

export default async function MyJobsPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user and verify they're a customer
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== UserRole.CUSTOMER) {
    redirect("/dashboard");
  }

  // Get user's jobs
  const jobs = await prisma.job.findMany({
    where: { customerId: user.id },
    include: {
      _count: {
        select: {
          applications: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Manage your job postings and view applications
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">Post New Job</Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No jobs posted yet</CardTitle>
            <CardDescription>
              Get started by posting your first job to connect with local
              tradespeople.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/jobs/new">Post Your First Job</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} variant="customer" />
          ))}
        </div>
      )}
    </div>
  );
}
