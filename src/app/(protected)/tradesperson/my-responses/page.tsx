import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { MyResponsesClient } from "@/components/responses/MyResponsesClient";
import { UserRole } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export default async function MyResponsesPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get the user and verify role
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user || user.role !== UserRole.TRADESPERSON) {
    redirect("/onboarding");
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
    <div className="container mx-auto px-4 py-6">
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
