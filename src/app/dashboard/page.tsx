import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CustomerDashboard from "@/components/dashboard/CustomerDashboard";
import TradespersonDashboard from "@/components/dashboard/TradespersonDashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PlusCircle,
  FileText,
  MessageSquare,
  Briefcase,
  BarChart3,
} from "lucide-react";
import Link from "next/link";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  // These checks are also in layout, but adding here for extra security
  if (!user) {
    redirect("/sign-in");
    return;
  }

  if (!user.role) {
    redirect("/onboarding");
    return;
  }

  // Role-based dashboard rendering
  if (user.role === UserRole.CUSTOMER) {
    return <CustomerDashboardPage user={user} />;
  } else if (user.role === UserRole.TRADESPERSON) {
    return <TradespersonDashboardPage user={user} />;
  } else {
    // Invalid role - redirect to onboarding
    redirect("/onboarding");
    return;
  }
}

// Customer Dashboard Server Component
async function CustomerDashboardPage({ user }: { user: any }) {
  // Get user's job stats for quick overview - matching original customer page
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

  // Return the exact same content as the original customer page
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
                <Link href="/dashboard/jobs/new">
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
                  <CardTitle className="text-lg">My Jobs</CardTitle>
                  <CardDescription>
                    View and manage your job postings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/my-jobs">
                  <FileText className="h-4 w-4 mr-2" />
                  View Jobs ({recentJobs.length})
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Messages</CardTitle>
                  <CardDescription>
                    Chat with interested tradespeople
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
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
              <div className="text-sm text-muted-foreground">Active Jobs</div>
            </div>

            <div className="text-center p-4 bg-blue-500/5 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {totalApplications}
              </div>
              <div className="text-sm text-muted-foreground">
                Applications Received
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Jobs</CardTitle>
                <CardDescription>Your latest job postings</CardDescription>
              </div>
              <Button asChild variant="outline">
                <Link href="/dashboard/my-jobs">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentJobs.slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{job.title}</h4>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          job.status === "OPEN"
                            ? "bg-green-100 text-green-800"
                            : job.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : job.status === "COMPLETED"
                            ? "bg-gray-100 text-gray-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {job.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Posted{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(job.createdAt)}
                      </span>
                      <span>{job._count.applications} applications</span>
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/jobs/my-jobs/${job.id}`}>View</Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Tradesperson Dashboard Server Component
async function TradespersonDashboardPage({ user }: { user: any }) {
  // Get tradesperson stats - matching original tradesperson page
  const [applications, jobs] = await Promise.all([
    prisma.application.count({
      where: { tradespersonId: user.id },
    }),
    prisma.job.count({
      where: {
        status: "OPEN",
        // Only show jobs not applied to yet
        applications: {
          none: {
            tradespersonId: user.id,
          },
        },
      },
    }),
  ]);

  const displayName = user.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ""}`
    : "there";

  // Return the exact same content as the original tradesperson page
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Welcome back, {displayName}! 👋
        </h1>
        <p className="text-muted-foreground text-lg">
          Find new opportunities and manage your business
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Browse Jobs</CardTitle>
                  <CardDescription>
                    Find new projects to work on
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/dashboard/jobs">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Browse Jobs ({jobs})
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">My Responses</CardTitle>
                  <CardDescription>
                    Manage your job applications
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/my-responses">
                  <FileText className="h-4 w-4 mr-2" />
                  My Responses ({applications})
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Messages</CardTitle>
                  <CardDescription>Communicate with customers</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/messages">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Messages
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Quote Templates</CardTitle>
                  <CardDescription>Manage your quote templates</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/quote-templates">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Templates
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
            <div className="text-center p-4 bg-blue-500/5 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{jobs}</div>
              <div className="text-sm text-muted-foreground">
                Available Jobs
              </div>
            </div>

            <div className="text-center p-4 bg-green-500/5 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {applications}
              </div>
              <div className="text-sm text-muted-foreground">
                Applications Sent
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
