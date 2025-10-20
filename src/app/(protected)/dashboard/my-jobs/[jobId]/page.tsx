import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import { ManageResponsesClient } from "./ManageResponsesClient";
import { createLogger } from '@/lib/logger';
import { ErrorBoundary } from "@/components/ErrorBoundary";

const logger = createLogger('customer-manage-job');
const metadataLogger = createLogger('customer-manage-job-metadata');

export const dynamic = "force-dynamic";

interface ManageResponsesPageProps {
  params: Promise<{
    jobId: string;
  }>;
}

export async function generateMetadata({
  params,
}: ManageResponsesPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  
  try {
    const job = await prisma.job.findUnique({
      where: { id: resolvedParams.jobId },
      select: {
        title: true,
        description: true,
      },
    });

    if (!job) {
      return {
        title: "Job Not Found",
      };
    }

    return {
      title: `Manage Responses - ${job.title}`,
      description: `Manage applications and responses for: ${job.description.substring(0, 100)}`,
    };
  } catch (error) {
    metadataLogger.error({ error }, "Error generating metadata");
    return {
      title: "Manage Responses",
    };
  }
}

export default async function ManageResponsesPage({
  params,
}: ManageResponsesPageProps) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      redirect("/sign-in");
    }

    if (!user.role) {
      redirect("/onboarding");
    }

    if (user.role !== UserRole.CUSTOMER) {
      redirect("/dashboard/jobs");
    }

    const resolvedParams = await params;

    // Get job details with responses
    const job = await prisma.job.findUnique({
      where: {
        id: resolvedParams.jobId,
        customerId: user.id, // Ensure user owns this job
      },
      select: {
        id: true,
        title: true,
        status: true,
        depositPaid: true,
        finalPaid: true,
        budget: true,
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

    return (
      <ErrorBoundary>
        <ManageResponsesClient job={job} />
      </ErrorBoundary>
    );
  } catch (error) {
    logger.error({ error }, "Error in manage responses page");
    redirect("/sign-in");
  }
}
