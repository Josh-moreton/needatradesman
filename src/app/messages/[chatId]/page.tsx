import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ChatInterface } from "@/components/messages/ChatInterface";

interface ChatPageProps {
  searchParams: Promise<{
    jobId?: string;
    with?: string;
  }>;
}

export default async function ChatPage({
  searchParams,
}: ChatPageProps) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.role) {
    redirect("/onboarding");
  }

  const resolvedSearchParams = await searchParams;
  const { jobId, with: withUserId } = resolvedSearchParams;

  // If specific job and user are provided, validate they can chat
  if (jobId && withUserId) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        applications: {
          where: { tradespersonId: withUserId },
        },
      },
    });

    if (!job) {
      redirect("/messages");
    }

    const isJobOwner = job.customerId === user.id;
    const hasApplied = job.applications.length > 0;
    const isApplicant = user.id === withUserId;

    if (!isJobOwner && !hasApplied && !isApplicant) {
      redirect("/messages");
    }
  }

  return (
    <DashboardLayout userRole={user.role}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Messages</h1>
        <ChatInterface currentUserId={user.id} />
      </div>
    </DashboardLayout>
  );
}
