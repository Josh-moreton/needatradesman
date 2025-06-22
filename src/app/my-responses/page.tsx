import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { MyResponsesClient } from "@/components/responses/MyResponsesClient";

export const dynamic = "force-dynamic";

export default async function MyResponsesPage() {
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

    // Fetch all applications for this tradesperson, with job details and customer
    const applications = await prisma.application.findMany({
      where: { tradespersonId: user.id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            location: true,
            budget: true,
            status: true,
            customer: {
              select: { firstName: true, lastName: true, id: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return (
      <DashboardLayout userRole={user.role}>
        <MyResponsesClient applications={applications} />
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Error in my responses page:", error);
    redirect("/sign-in");
  }
}
