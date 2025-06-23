import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PlusCircle, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function CustomerHomePage() {
  const user = await getCurrentUser();

  // Get user's job stats for quick overview
  const [recentJobs, totalApplications] = await Promise.all([
    prisma.job.findMany({
      where: { customerId: user!.id },
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
          customerId: user!.id,
        },
      },
    }),
  ]);

  const displayName = user!.firstName
    ? `${user!.firstName}${user!.lastName ? ` ${user!.lastName}` : ""}`
    : "there";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome back, {displayName}! 👋
        </h1>
        <p className="text-muted-foreground text-lg">
          Manage your jobs and connect with qualified tradespeople
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <PlusCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Post a New Job</CardTitle>
                  <CardDescription>
                    Get quotes from qualified tradespeople
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/customer/jobs/new">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Post Job
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Manage Jobs</CardTitle>
                  <CardDescription>
                    View and manage your posted jobs
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/customer/jobs/my-jobs">
                  <FileText className="h-4 w-4 mr-2" />
                  My Jobs ({recentJobs.length})
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

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
              <div className="text-sm text-muted-foreground">Jobs Posted</div>
            </div>

            <div className="text-center p-4 bg-green-500/5 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {totalApplications}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Responses
              </div>
            </div>

            <Button asChild className="w-full" variant="outline">
              <Link href="/customer/messages">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentJobs.slice(0, 3).map((job) => (
              <Card key={job.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base truncate">
                    {job.title}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {job._count.applications} responses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="ghost" size="sm" className="w-full">
                    <Link href={`/customer/jobs/my-jobs/${job.id}`}>
                      View Details
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
