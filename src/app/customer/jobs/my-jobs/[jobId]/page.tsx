import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import { ManageResponsesClient } from "./ManageResponsesClient";

export const dynamic = "force-dynamic";

interface ManageResponsesPageProps {
  params: Promise<{
    jobId: string;
  }>;
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
      redirect("/jobs");
    }

    const resolvedParams = await params;

    // Get job details with responses
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

    return <ManageResponsesClient job={job} />;
  } catch (error) {
    console.error("Error in manage responses page:", error);
    redirect("/sign-in");
  }
}
