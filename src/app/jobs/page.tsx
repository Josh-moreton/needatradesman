import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, JobCategory } from "@prisma/client";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilters } from "@/components/jobs/JobFilters";
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

    // Await searchParams before using them
    const resolvedSearchParams = await searchParams;

    // Build filter conditions
    const where: {
      status: "OPEN";
      category?: JobCategory;
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
    };

    if (
      resolvedSearchParams.category &&
      Object.values(JobCategory).includes(
        resolvedSearchParams.category as JobCategory
      )
    ) {
      where.category = resolvedSearchParams.category as JobCategory;
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
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Available Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Browse and apply to jobs in your area
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <JobFilters />
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
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Clear all filters
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-6 mb-8">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} variant="public" />
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
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
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
                          ? "bg-blue-600 text-white border-blue-600"
                          : "border-gray-300 hover:bg-gray-50"
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
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error in jobs page:", error);
    redirect("/sign-in");
  }
}
