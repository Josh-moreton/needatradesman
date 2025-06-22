import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  ArrowRight,
  FileText,
  Briefcase,
  Clock,
} from "lucide-react";
import type { Application, Job, User } from "@prisma/client";

// Strict types for application with job and customer
interface ApplicationWithJob extends Application {
  job: Pick<Job, "id" | "title" | "location" | "budget" | "status"> & {
    customer?: Pick<User, "firstName" | "lastName" | "id"> | null;
  };
}

export const dynamic = "force-dynamic";

export default async function MyResponsesPage() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect("/sign-in");
    }
    if (!user.role) {
      redirect("/onboarding");
    }
    if (user.role !== UserRole.TRADESPERSON) {
      redirect("/dashboard");
    }

    // Fetch all applications for this tradesperson, with job details and customer
    const applications: ApplicationWithJob[] =
      await prisma.application.findMany({
        where: { tradespersonId: user.id },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              location: true,
              budget: true,
              status: true,
              customer: {
                select: { firstName: true, lastName: true, id: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

    return (
      <DashboardLayout userRole={user.role}>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Responses</h1>
            <p className="text-muted-foreground mt-2">
              View and track your job applications and their status
            </p>
          </div>

          {applications.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No responses yet</CardTitle>
                <CardDescription>
                  When you apply to jobs, your responses will appear here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/jobs">Browse Jobs</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {applications.map((app) => (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          <Link href={`/jobs/${app.job.id}`}>
                            {app.job.title}
                          </Link>
                        </CardTitle>
                        <CardDescription>
                          {app.job.location || "Location not specified"} •{" "}
                          {formatBudget(app.job.budget)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusColor(app.status)}>
                          {app.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <span className="font-medium">Your message:</span>
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {app.message}
                        </p>
                      </div>
                      {typeof app.quote === "number" && (
                        <div>
                          <span className="font-medium">Your quote:</span> £
                          {Number(app.quote).toFixed(2)}
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/jobs/${app.job.id}`}>
                            <FileText className="h-4 w-4 mr-2" />
                            View Job
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link
                            href={
                              `/messages?jobId=${app.job.id}` +
                              (app.job.customer?.id
                                ? `&with=${app.job.customer.id}`
                                : "")
                            }
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message Customer
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Error in my responses page:", error);
    redirect("/sign-in");
  }
}

function getStatusColor(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "ACCEPTED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "WITHDRAWN":
      return "outline";
    default:
      return "secondary";
  }
}

function formatBudget(budget: number | null | undefined) {
  if (!budget) return "Budget not specified";
  return `£${Number(budget).toFixed(0)}`;
}
