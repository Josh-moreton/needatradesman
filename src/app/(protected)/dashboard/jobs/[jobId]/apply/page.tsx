import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import { ResponseForm } from "@/components/applications/ResponseForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createLogger } from "@/lib/logger";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const logger = createLogger("dashboard-apply");

// This page uses authentication and dynamic params, so it should be dynamically rendered
export const dynamic = "force-dynamic";

interface ApplyPageProps {
  readonly params: Promise<{
    readonly jobId: string;
  }>;
}

export default async function ApplyPage({ params }: ApplyPageProps) {
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

    // Await params before using them
    const resolvedParams = await params;

    // Get job details
    const job = await prisma.job.findUnique({
      where: { id: resolvedParams.jobId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      notFound();
    }

    if (job.status !== "OPEN") {
      redirect(`/dashboard/jobs/${job.id}`);
    }

    // Check if already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_tradespersonId: {
          jobId: job.id,
          tradespersonId: user.id,
        },
      },
    });

    if (existingApplication) {
      redirect(`/dashboard/jobs/${job.id}`);
    }

    const getCustomerName = () => {
      if (!job.customer) return "Anonymous";
      return job.customer.name || "Anonymous";
    };

    const formatBudget = (budget: unknown) => {
      if (!budget) return "Budget not specified";
      return `£${Number(budget).toFixed(0)}`;
    };

    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link href={`/dashboard/jobs/${job.id}`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Job
            </Link>
          </Button>
        </div>

        {/* Job Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{job.title}</CardTitle>
            <CardDescription>
              Posted by {getCustomerName()} • {job.location} •{" "}
              {formatBudget(job.budget)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {job.description.length > 200
                ? `${job.description.substring(0, 200)}...`
                : job.description}
            </p>
          </CardContent>
        </Card>

        {/* Response Form */}
        <Card>
          <CardHeader>
            <CardTitle>Respond to this Job</CardTitle>
            <CardDescription>
              Submit your response with a message and optional quote. The
              customer will review your response and may contact you directly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ErrorBoundary>
              <ResponseForm jobId={job.id} userId={user.id} />
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    logger.error({ error }, "Error in apply page");
    redirect("/sign-in");
  }
}
