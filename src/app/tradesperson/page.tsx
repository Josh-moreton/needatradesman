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
import { BarChart3, Briefcase, FileText, MessageSquare } from "lucide-react";
import Link from "next/link";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function TradespersonHomePage() {
  const user = await getCurrentUser();

  // Get tradesperson stats
  const [applications, jobs] = await Promise.all([
    prisma.application.count({
      where: { tradespersonId: user!.id },
    }),
    prisma.job.count({
      where: {
        status: "OPEN",
        // Only show jobs not applied to yet
        applications: {
          none: {
            tradespersonId: user!.id,
          },
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
                <Link href="/tradesperson/jobs">
                  <Briefcase className="h-4 w-4 mr-2" />
                  Browse Jobs ({jobs})
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
                  <CardTitle className="text-lg">Dashboard</CardTitle>
                  <CardDescription>
                    View your stats and analytics
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/tradesperson/dashboard">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Dashboard
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
                <Link href="/tradesperson/my-responses">
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
                <Link href="/tradesperson/messages">
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
