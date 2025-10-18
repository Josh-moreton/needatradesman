import { getCurrentUser } from "@/lib/auth";
import { UserRole, JobCategory } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { JobCard } from "@/components/jobs/JobCard";
import { JobFilters } from "@/components/jobs/JobFilters";

interface SearchParams {
  search?: string;
  location?: string;
  category?: string;
  page?: string;
}

export default async function DashboardJobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
    return;
  }

  // Role-based job browsing
  if (user.role === UserRole.TRADESPERSON) {
    return <TradespersonJobsView user={user} searchParams={searchParams} />;
  } else if (user.role === UserRole.CUSTOMER) {
    // Customers should see their own jobs
    redirect("/dashboard/my-jobs");
  }

  // Invalid role - this shouldn't happen as layout handles it
  // Redirect to dashboard which will show onboarding via layout
  redirect("/dashboard");
}

async function TradespersonJobsView({
  user,
  searchParams,
}: {
  user: { trades?: JobCategory[] };
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;

  // Get user's trades for filtering
  const userTrades = user.trades || [];

  // Build query filters
  const page = parseInt(resolvedSearchParams.page || "1");
  const limit = 12;
  const offset = (page - 1) * limit;

  const where: Record<string, unknown> = {
    status: "OPEN",
  };

  if (resolvedSearchParams.search) {
    where.OR = [
      { title: { contains: resolvedSearchParams.search, mode: "insensitive" } },
      {
        description: {
          contains: resolvedSearchParams.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (resolvedSearchParams.location) {
    where.location = {
      contains: resolvedSearchParams.location,
      mode: "insensitive",
    };
  }

  if (
    resolvedSearchParams.category &&
    resolvedSearchParams.category !== "all"
  ) {
    where.category = resolvedSearchParams.category;
  }

  // If user has specific trades, filter to only show jobs in those categories
  if (
    userTrades.length > 0 &&
    (!resolvedSearchParams.category || resolvedSearchParams.category === "all")
  ) {
    where.category = { in: userTrades };
  }

  // Get jobs with application counts
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
      take: limit,
      skip: offset,
    }),
    prisma.job.count({ where }),
  ]);

  const totalPages = Math.ceil(totalJobs / limit);

  return (
    <div className="container mx-auto px-4 py-6 bg-background min-h-screen">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Available Jobs</h1>
        <p className="text-muted-foreground">
          Find jobs that match your skills and expertise
        </p>
      </div>

      <div className="mb-6">
        <JobFilters userTrades={userTrades} />
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">
            No jobs found matching your criteria
          </p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search filters or check back later for new
            opportunities
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} variant="public" />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <a
                    key={pageNum}
                    href={`?${new URLSearchParams({
                      ...resolvedSearchParams,
                      page: pageNum.toString(),
                    }).toString()}`}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      pageNum === page
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {pageNum}
                  </a>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
