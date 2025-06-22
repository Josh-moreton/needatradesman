import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, JobCategory } from "@/lib/schemas";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilters } from "@/components/jobs/JobFilters";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// This page uses authentication and search params, so it should be dynamically rendered
export const dynamic = "force-dynamic";

interface JobFeedPageProps {
  searchParams: Promise<{
    category?: string;
    location?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function JobFeedPage({ searchParams }: JobFeedPageProps) {
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

    // Check if tradesperson has selected trades
    if (!user.trades || user.trades.length === 0) {
      redirect("/onboarding");
    }

    // Await searchParams before using them
    const resolvedSearchParams = await searchParams;

    // Build filter conditions - only show jobs in tradesperson's selected trades
    const where: {
      status: "OPEN";
      category: { in: JobCategory[] };
      location?: {
        contains: string;
        mode: "insensitive";
      };
      OR?: Array<{
        title?: {
          contains: string;
          mode: "insensitive";
        };
        description?: {
          contains: string;
          mode: "insensitive";
        };
      }>;
    } = {
      status: "OPEN",
      category: { in: user.trades },
    };

    // If category filter is provided and it's in user's trades, use it
    if (
      resolvedSearchParams.category &&
      Object.values(JobCategory).includes(
        resolvedSearchParams.category as JobCategory
      ) &&
      user.trades.includes(resolvedSearchParams.category as JobCategory)
    ) {
      where.category = { in: [resolvedSearchParams.category as JobCategory] };
    }

    if (resolvedSearchParams.location) {
      where.location = {
        contains: resolvedSearchParams.location,
        mode: "insensitive",
      };
    }

    if (resolvedSearchParams.search) {
      where.OR = [
        {
          title: {
            contains: resolvedSearchParams.search,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: resolvedSearchParams.search,
            mode: "insensitive",
          },
        },
      ];
    }

    // Pagination
    const page = parseInt(resolvedSearchParams.page || "1", 10);
    const pageSize = 12;
    const skip = (page - 1) * pageSize;

    // Get jobs with pagination
    const [jobs, totalJobs] = await Promise.all([
      prisma.job.findMany({
        where,
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
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: pageSize,
      }),
      prisma.job.count({ where }),
    ]);

    const totalPages = Math.ceil(totalJobs / pageSize);

    return (
      <DashboardLayout userRole={user.role}>
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Available Jobs</h1>
            <p className="text-muted-foreground mt-2">
              Browse and respond to jobs in your selected trades:{" "}
              {user.trades
                .map((trade: JobCategory) =>
                  trade
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (l: string) => l.toUpperCase())
                )
                .join(", ")}
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8">
            <JobFilters userTrades={user.trades} />
          </div>

          {/* Results */}
          {jobs.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No jobs found</CardTitle>
                <CardDescription>
                  {resolvedSearchParams.category ||
                  resolvedSearchParams.location ||
                  resolvedSearchParams.search
                    ? "Try adjusting your filters to see more jobs."
                    : "No jobs are currently available. Check back later for new opportunities."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(resolvedSearchParams.category ||
                  resolvedSearchParams.location ||
                  resolvedSearchParams.search) && (
                  <Link
                    href="/jobs"
                    className="text-primary hover:text-primary/80 underline"
                  >
                    Clear all filters
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-6 mb-8">
                {jobs.map((job: unknown) => (
                  <JobCard
                    key={(job as { id: string }).id}
                    job={job as Parameters<typeof JobCard>[0]["job"]}
                    variant="public"
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  {page > 1 && (
                    <Link
                      href={`/jobs?${new URLSearchParams({
                        ...resolvedSearchParams,
                        page: (page - 1).toString(),
                      }).toString()}`}
                      className="px-4 py-2 border border-border rounded-md hover:bg-accent"
                    >
                      Previous
                    </Link>
                  )}

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = page <= 3 ? i + 1 : page - 2 + i;
                    if (pageNum > totalPages) return null;

                    return (
                      <Link
                        key={pageNum}
                        href={`/jobs?${new URLSearchParams({
                          ...resolvedSearchParams,
                          page: pageNum.toString(),
                        }).toString()}`}
                        className={`px-4 py-2 border rounded-md ${
                          pageNum === page
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-accent"
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}

                  {page < totalPages && (
                    <Link
                      href={`/jobs?${new URLSearchParams({
                        ...resolvedSearchParams,
                        page: (page + 1).toString(),
                      }).toString()}`}
                      className="px-4 py-2 border border-border rounded-md hover:bg-accent"
                    >
                      Next
                    </Link>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    );
  } catch (error) {
    console.error("Error in jobs page:", error);
    redirect("/sign-in");
  }
}
