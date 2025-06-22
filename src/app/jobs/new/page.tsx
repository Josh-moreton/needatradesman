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
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Clock, PlusCircle } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { prisma } from "@/lib/prisma";
import { Job } from "@prisma/client";

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

    // Get user's job stats for quick overview
    const [recentJobs, totalApplications] = await Promise.all([
      prisma.job.findMany({
        where: { customerId: user.id },
        include: {
          _count: {
            select: { applications: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.application.count({
        where: {
          job: {
            customerId: user.id,
          },
        },
      }),
    ]);

    const displayName = user.firstName
      ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
      : "there";

    return (
      <DashboardLayout userRole={user.role}>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Hey {displayName}! 👋
            </h1>
            <p className="text-muted-foreground text-lg">
              Need work done? Post a job and get responses from qualified
              tradespeople
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Main Job Posting Section */}
            <div className="lg:col-span-3">
              <Card className="border-primary/20">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <PlusCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Post a New Job</CardTitle>
                      <CardDescription className="text-base">
                        Describe your project and connect with trusted
                        tradespeople
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <JobForm />
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats & Actions Sidebar */}
            <div className="space-y-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Your Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {recentJobs.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Jobs Posted
                    </div>
                  </div>

                  <div className="text-center p-4 bg-green-500/5 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {totalApplications}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Responses
                    </div>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Button asChild className="w-full" variant="outline">
                      <Link href="/jobs/my-jobs">
                        <FileText className="h-4 w-4 mr-2" />
                        Manage Jobs
                      </Link>
                    </Button>

                    <Button asChild className="w-full" variant="outline">
                      <Link href="/messages">
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Messages
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Jobs Quick View */}
              {recentJobs.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Recent Jobs</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {recentJobs.slice(0, 3).map((job) => (
                      <div
                        key={job.id}
                        className="p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm leading-tight">
                            {job.title}
                          </h4>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-green-600 font-medium">
                            {job._count.applications} responses
                          </span>
                          <Button
                            asChild
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2"
                          >
                            <Link href={`/jobs/my-jobs/${job.id}`}>View →</Link>
                          </Button>
                        </div>
                        {/* Example of using budget safely: */}
                        {/* <div>Budget: {job.budget ? Number(job.budget).toLocaleString() : 'N/A'}</div> */}
                      </div>
                    ))}
                    {recentJobs.length > 3 && (
                      <Button
                        asChild
                        variant="ghost"
                        className="w-full h-8 text-xs"
                      >
                        <Link href="/jobs/my-jobs">
                          View all {recentJobs.length} jobs →
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Error in new job page:", error);
    redirect("/sign-in");
  }
}
