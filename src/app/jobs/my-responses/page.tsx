import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/schemas";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MyResponsesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.role !== UserRole.TRADESPERSON) redirect("/dashboard");

  // Fetch all applications for this tradesperson
  const applications = await prisma.application.findMany({
    where: { tradespersonId: user.id },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          category: true,
          location: true,
          status: true,
          customer: {
            select: { firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">My Responses</h1>
      {applications.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            You haven&apos;t responded to any jobs yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app: {
            id: string;
            job: {
              id: string;
              title: string;
              category: string;
              location: string;
              status: string;
              customer?: { firstName: string | null; lastName: string | null } | null;
            };
          }) => (
            <Card key={app.job.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  <Link href={`/jobs/${app.job.id}`}>{app.job.title}</Link>
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  {app.job.category} &middot; {app.job.location}
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div>
                  Status: <span className="font-medium">{app.job.status}</span>
                </div>
                <div>
                  Customer: {app.job.customer?.firstName}{" "}
                  {app.job.customer?.lastName}
                </div>
                <Link
                  href={`/jobs/${app.job.id}`}
                  className="text-primary underline text-sm mt-2"
                >
                  View Job
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
