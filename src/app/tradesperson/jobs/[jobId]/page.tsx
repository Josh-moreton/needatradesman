import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";

const logger = createLogger('tradesperson-job-detail');
const metadataLogger = createLogger('tradesperson-job-detail-metadata');

// This page uses authentication and dynamic params, so it should be dynamically rendered
export const dynamic = "force-dynamic";

interface JobDetailPageProps {
  params: Promise<{
    jobId: string;
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

export default async function JobDetailPage({ params }: JobDetailPageProps) {
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

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: resolvedParams.jobId },
      include: {
        customer: {
          select: {
            firstName: true,
            lastName: true,
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

    // For tradespeople, check if they already responded
    let hasResponded = false;
    if (user.role === UserRole.TRADESPERSON) {
      const existingApplication = await prisma.application.findUnique({
        where: {
          jobId_tradespersonId: {
            jobId: job.id,
            tradespersonId: user.id,
          },
        },
      });
      hasResponded = !!existingApplication;
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
      if (!budget) return "Budget not specified";
      return `£${Number(budget).toFixed(0)}`;
    };

    const getCustomerName = () => {
      if (!job.customer) return "Anonymous";
      const { firstName, lastName } = job.customer;
      if (firstName && lastName) return `${firstName} ${lastName}`;
      if (firstName) return firstName;
      return "Anonymous";
    };

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
    };

    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href="/tradesperson/jobs">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
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
              <Badge
                variant={
                  getStatusColor(job.status) as
                    | "default"
                    | "secondary"
                    | "destructive"
                }
                className="ml-4"
              >
                {job.status.replace("_", " ")}
              </Badge>
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
                {job._count.applications !== 1 ? "s" : ""}
              </p>
              <p className="text-muted-foreground">
                {job._count.applications === 0
                  ? "Be the first to apply!"
                  : "Other tradespeople have shown interest"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
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
                      <Link href={`/customer/jobs/my-jobs/${job.id}`}>Manage Responses</Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {user.role === UserRole.CUSTOMER && job.customerId === user.id && (
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
                  <Link href={`/jobs/my-jobs/${job.id}`}>Manage Responses</Link>
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
