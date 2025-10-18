import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MyResponsesClient } from "@/components/responses/MyResponsesClient";

export const dynamic = "force-dynamic";

export default async function DashboardMyResponsesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
    return;
  }

  if (!user.role) {
    redirect("/onboarding");
    return;
  }

  // Only tradespeople should see this page
  if (user.role !== UserRole.TRADESPERSON) {
    redirect("/dashboard");
    return;
  }

  // Get all applications for this tradesperson
  const applications = await prisma.application.findMany({
    where: {
      tradespersonId: user.id,
    },
    include: {
      job: {
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="container mx-auto px-4 py-6 bg-background min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Responses</h1>
        <p className="text-muted-foreground">
          Track all your job applications and their status
        </p>
      </div>

      <MyResponsesClient applications={applications} />
    </div>
  );
}
