import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Users,
  CheckCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";

const logger = createLogger("dashboard-job-detail");
const metadataLogger = createLogger("dashboard-job-detail-metadata");

// This page uses authentication and dynamic params, so it should be dynamically rendered
export const dynamic = "force-dynamic";

interface JobDetailPageProps {
  readonly params: Promise<{
    jobId: string;
  }>;
  readonly searchParams: Promise<{
    payment_success?: string;
    payment_cancelled?: string;
    final_payment_success?: string;
    final_payment_cancelled?: string;
  }>;
}

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params;

  try {
    const job = await prisma.job.findUnique({
      where: { id: resolvedParams.jobId },
      select: {
        title: true,
        description: true,
        location: true,
        category: true,
      },
    });

    if (!job) {
      return {
        title: "Job Not Found",
      };
    }

    const description = job.description.substring(0, 160);

    return {
      title: job.title,
      description,
      openGraph: {
        title: job.title,
        description,
        type: "article",
        images: [
          {
            url: "/og-image.png",
            width: 1200,
            height: 630,
            alt: job.title,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: job.title,
        description,
        images: ["/og-image.png"],
      },
    };
  } catch (error) {
    metadataLogger.error({ error }, "Error generating metadata");
    return {
      title: "Job Details",
    };
  }
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

    // Await params before using them
    const resolvedParams = await params;
    const resolvedSearchParams = await searchParams;

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: resolvedParams.jobId },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
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
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    if (!job) {
      notFound();
    }

    // Check if current user has already responded (for tradespeople)
    let hasResponded = false;
    let userApplication = null;
    if (user.role === UserRole.TRADESPERSON) {
      userApplication = await prisma.application.findUnique({
        where: {
          jobId_tradespersonId: {
            jobId: job.id,
            tradespersonId: user.id,
          },
        },
      });
      hasResponded = !!userApplication;
    }

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
          return "default";
      }
    };

    const formatBudget = (budget: unknown) => {
      if (budget) {
        return `£${Number(budget).toFixed(0)}`;
      }
      return "Budget not specified";
    };

    const getCustomerName = () => {
      if (job.customer) {
        const { firstName, lastName } = job.customer;
        if (firstName && lastName) return `${firstName} ${lastName}`;
        if (firstName) return firstName;
      }
      return "Anonymous";
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    };

    const isCustomerOwner = user.role === UserRole.CUSTOMER && job.customerId === user.id;

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Payment Success/Cancel Messages */}
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

        {resolvedSearchParams.payment_cancelled === "true" && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Payment Cancelled</span>
              </div>
              <p className="text-amber-700 mt-1">
                Your payment was cancelled. You can retry the payment anytime.
              </p>
            </CardContent>
          </Card>
        )}

        {resolvedSearchParams.final_payment_success === "true" && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Final Payment Successful!</span>
              </div>
              <p className="text-green-700 mt-1">
                The job has been marked as complete and payment has been processed.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Back Navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href={isCustomerOwner ? "/dashboard/my-jobs" : "/dashboard/jobs"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to {isCustomerOwner ? "My Jobs" : "Jobs"}
            </Link>
          </Button>
        </div>

        {/* Job Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{job.title}</CardTitle>
                <CardDescription className="text-base">
                  {job.description}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 ml-4">
                <Badge variant={getStatusColor(job.status)}>
                  {job.status.replace("_", " ")}
                </Badge>
                {job.depositPaid && (
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    ✓ Deposit Paid
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Job Details */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-muted-foreground">{job.location}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-accent" />
                <div>
                  <p className="font-medium">Budget</p>
                  <p className="text-muted-foreground">
                    {formatBudget(job.budget)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Posted</p>
                  <p className="text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">{getCustomerName()}</p>
              <p className="text-muted-foreground">Category: {job.category}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-medium">
                {job._count.applications} application
                {job._count.applications === 1 ? "" : "s"}
              </p>
              <p className="text-muted-foreground">
                {job._count.applications > 0
                  ? "Tradespeople have shown interest"
                  : "Be the first to apply!"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons - Tradesperson View */}
        {user.role === UserRole.TRADESPERSON && job.status === "OPEN" && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                {hasResponded ? (
                  <div>
                    <Badge variant="secondary" className="mb-3">
                      Response Submitted
                    </Badge>
                    <p className="text-muted-foreground">
                      You have already responded to this job. The customer will
                      review your response.
                    </p>
                    {userApplication && (
                      <div className="mt-4">
                        <Badge variant="outline">
                          Status: {userApplication.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      Interested in this job?
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Submit a response to show your interest and start a
                      conversation with the customer.
                    </p>
                    <Button size="lg" asChild>
                      <Link href={`/dashboard/jobs/${job.id}/apply`}>
                        Apply Now
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons - Customer Owner View */}
        {isCustomerOwner && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">
                  This is your job posting
                </h3>
                <p className="text-muted-foreground mb-4">
                  Manage responses and communicate with interested tradespeople.
                </p>
                <Button size="lg" asChild>
                  <Link href={`/dashboard/my-jobs/${job.id}`}>
                    Manage Responses
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    logger.error({ error }, "Error in job detail page");
    redirect("/sign-in");
  }
}
