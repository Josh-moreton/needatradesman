import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
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

// This page uses authentication and dynamic params, so it should be dynamically rendered
export const dynamic = "force-dynamic";

interface ApplyPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export default async function ApplyPage({ params }: ApplyPageProps) {
  try {
    const { userId } = await auth();

    if (!userId) {
      redirect("/sign-in");
    }

    // Get the user and validate they are a tradesperson
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      redirect("/onboarding");
    }

    if (!user.role) {
      redirect("/onboarding");
    }

    if (user.role !== UserRole.TRADESPERSON) {
      redirect("/customer");
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
      },
    });

    if (!job) {
      notFound();
    }

    if (job.status !== "OPEN") {
      redirect(`/jobs/${job.id}`);
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
      redirect(`/tradesperson/jobs/${job.id}`);
    }

    const getCustomerName = () => {
      if (!job.customer) return "Anonymous";
      const { firstName, lastName } = job.customer;
      if (firstName && lastName) return `${firstName} ${lastName}`;
      if (firstName) return firstName;
      return "Anonymous";
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
            <Link href={`/jobs/${job.id}`}>
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
            <p className="text-sm text-muted-foreground">
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
            <ResponseForm jobId={job.id} />
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    console.error("Error in apply page:", error);
    redirect("/sign-in");
  }
}
