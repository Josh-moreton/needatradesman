import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  MapPin,
  DollarSign,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface JobDetailPageProps {
  params: Promise<{
    jobId: string;
  }>;
  searchParams: Promise<{
    payment_success?: string;
    payment_cancelled?: string;
  }>;
}

export default async function JobDetailPage({
  params,
  searchParams,
}: JobDetailPageProps) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect("/sign-in");
    }

    if (!user.role) {
      redirect("/onboarding");
    }

    if (user.role !== UserRole.CUSTOMER) {
      redirect("/jobs");
    }

    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    // Get job details
    const job = await prisma.job.findUnique({
      where: {
        id: resolvedParams.jobId,
        customerId: user.id, // Ensure user owns this job
      },
      include: {
        applications: {
          include: {
            tradesperson: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!job) {
      notFound();
    }

    const formatBudget = (budget: any) => {
      if (!budget) return "Budget not specified";
      return `£${Number(budget).toFixed(2)}`;
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case "OPEN":
          return "default";
        case "IN_PROGRESS":
          return "secondary";
        case "COMPLETED":
          return "default";
        case "CANCELLED":
          return "destructive";
        default:
          return "outline";
      }
    };

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/customer/jobs/my-jobs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to My Jobs
            </Link>
          </Button>
        </div>

        {/* Payment Success Message */}
        {resolvedSearchParams.payment_success === "true" && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Payment Successful!</span>
              </div>
              <p className="text-green-700 mt-1">
                Your deposit payment has been processed. The tradesperson will
                be notified and work can begin.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Payment Cancelled Message */}
        {resolvedSearchParams.payment_cancelled === "true" && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Payment Cancelled</span>
              </div>
              <p className="text-amber-700 mt-1">
                Your payment was cancelled. You can retry the payment anytime
                from the manage responses page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Job Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{job.title}</CardTitle>
                <CardDescription className="mt-2 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4" />
                    {formatBudget(job.budget)}
                  </span>
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={getStatusColor(job.status) as any}>
                  {job.status.replace("_", " ")}
                </Badge>
                {job.depositPaid && (
                  <Badge
                    variant="secondary"
                    className="text-green-700 bg-green-100"
                  >
                    ✓ Deposit Paid
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {job.description}
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Posted on {formatDate(job.createdAt)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Applications Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Applications ({job.applications.length})</CardTitle>
            <CardDescription>
              Responses from tradespeople for this job
            </CardDescription>
          </CardHeader>
          <CardContent>
            {job.applications.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  No applications yet
                </h3>
                <p className="text-muted-foreground">
                  When tradespeople respond to your job, they&apos;ll appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {job.applications.map((application) => (
                  <div
                    key={application.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">
                        {application.tradesperson.firstName}{" "}
                        {application.tradesperson.lastName}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Applied {formatDate(application.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          application.status === "ACCEPTED"
                            ? "default"
                            : "outline"
                        }
                      >
                        {application.status}
                      </Badge>
                      {application.quote && (
                        <Badge variant="outline">
                          £{Number(application.quote).toFixed(2)}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <Button asChild>
                <Link href={`/customer/jobs/my-jobs/${job.id}`}>
                  Manage Applications
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error in job detail page:", error);
    redirect("/sign-in");
  }
}
