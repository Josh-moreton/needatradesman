import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createJobSchema, UserRole, JobCategory } from "@/lib/schemas";
import { createLogger } from "@/lib/logger";
import { PAGINATION } from "@/lib/constants";
import { validateSearchQuery } from "@/lib/utils";
import { unstable_cache, revalidateTag } from "next/cache";
import {
    redis,
    jobPostingRateLimit
} from "@/lib/redis";

const logger = createLogger("jobs-api");

export async function POST(request: NextRequest) {
    try {
        // Check authentication
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get user from database and verify role
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        if (user.role !== UserRole.CUSTOMER) {
            return new NextResponse("Only customers can create jobs", { status: 403 });
        }

        // Rate limiting for job posting (use clerkId to avoid reuse of internal IDs)
        if (jobPostingRateLimit) {
            try {
                const { success, limit, reset, remaining } = await jobPostingRateLimit.limit(user.clerkId);

                if (!success) {
                    const resetDate = new Date(reset);
                    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

                    return new NextResponse(
                        `Rate limit exceeded. You can only post ${limit} jobs per hour. ${remaining} remaining.`,
                        {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit': String(limit),
                                'X-RateLimit-Remaining': String(remaining),
                                'X-RateLimit-Reset': String(reset),
                                'Retry-After': String(retryAfter),
                            }
                        }
                    );
                }
            } catch (error) {
                // This is a Redis connection error - log it and continue
                logger.error({ error }, 'Rate limiter error (likely Redis connection issue)');
                // Allow the request to proceed if rate limiting fails due to connection issues
            }
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = createJobSchema.parse(body);

        // Extract location data from structured locationData if available
        const locationData = validatedData.locationData;
        // Always persist a non-empty location string for legacy search/display
        const locationString: string =
            (locationData?.displayText || locationData?.formattedAddress || validatedData.location || "").trim();

        // Create job in database
        const job = await prisma.job.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                category: validatedData.category,
                location: locationString,
                latitude: locationData?.latitude,
                longitude: locationData?.longitude,
                formattedAddress: locationData?.formattedAddress,
                city: locationData?.city,
                postcode: locationData?.postcode,
                budget: validatedData.budget,
                attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
                customerId: user.id,
                status: "OPEN",
            },
        });

        // Invalidate job feed caches when a new job is created
        if (redis) {
            try {
                revalidateTag('jobs');
                revalidateTag(`user-stats-${user.id}`);
                logger.debug('Invalidated job feed caches and user stats after job creation');
            } catch (cacheError) {
                logger.error({ error: cacheError }, 'Cache invalidation error');
                // Don't fail the request if cache invalidation fails
            }
        }

        return NextResponse.json(job, { status: 201 });
    } catch (error) {
        logger.error({ error }, 'Error creating job');

        if (error instanceof Error && error.name === "ZodError") {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get all open jobs for public viewing (tradespeople)
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const rawLocation = searchParams.get("location");
        const rawSearch = searchParams.get("search");
        const page = Number.parseInt(searchParams.get("page") || "1");

        // Allow limit override via query param with validation (between MIN and MAX)
        const requestedLimit = Number.parseInt(searchParams.get("limit") || String(PAGINATION.JOBS_PER_PAGE));
        const limit = Math.min(Math.max(requestedLimit, PAGINATION.MIN_JOBS_PER_PAGE), PAGINATION.MAX_JOBS_PER_PAGE);

        // Validate and sanitize search query
        let search: string | null = null;
        try {
            search = validateSearchQuery(rawSearch);
        } catch (error) {
            if (error instanceof Error) {
                return new NextResponse(error.message, { status: 400 });
            }
            return new NextResponse("Invalid search query", { status: 400 });
        }

        // Validate and sanitize location query
        let location: string | null = null;
        try {
            location = validateSearchQuery(rawLocation);
        } catch (error) {
            if (error instanceof Error) {
                return new NextResponse(error.message, { status: 400 });
            }
            return new NextResponse("Invalid location query", { status: 400 });
        }

        // Use unstable_cache for caching with Next.js
        const getJobsList = unstable_cache(
            async (filterParams: {
                category: string | null;
                location: string | null;
                search: string | null;
                page: number;
                limit: number;
            }) => {
                // Build where clause for database query
                const where = {
                    status: "OPEN" as const,
                    ...(filterParams.category && { category: filterParams.category as JobCategory }),
                    ...(filterParams.location && {
                        OR: [
                            {
                                location: {
                                    contains: filterParams.location,
                                    mode: "insensitive" as const,
                                }
                            },
                            {
                                postcode: {
                                    contains: filterParams.location,
                                    mode: "insensitive" as const,
                                }
                            },
                            {
                                city: {
                                    contains: filterParams.location,
                                    mode: "insensitive" as const,
                                }
                            }
                        ]
                    }),
                    ...(filterParams.search && {
                        OR: [
                            {
                                title: {
                                    contains: filterParams.search,
                                    mode: "insensitive" as const,
                                }
                            },
                            {
                                description: {
                                    contains: filterParams.search,
                                    mode: "insensitive" as const,
                                }
                            }
                        ]
                    }),
                };

                // Get total count for pagination
                const [jobs, totalCount] = await Promise.all([
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
                        skip: (filterParams.page - 1) * filterParams.limit,
                        take: filterParams.limit,
                    }),
                    prisma.job.count({ where })
                ]);

                return {
                    jobs,
                    pagination: {
                        page: filterParams.page,
                        limit: filterParams.limit,
                        total: totalCount,
                        pages: Math.ceil(totalCount / filterParams.limit),
                        hasMore: filterParams.page * filterParams.limit < totalCount
                    }
                };
            },
            ['jobs', category || 'all', location || 'all', search || 'all', String(page), String(limit)],
            {
                revalidate: 180, // 3 minutes for real-time feel
                tags: ['jobs']
            }
        );

        const response = await getJobsList({
            category,
            location,
            search,
            page,
            limit
        });

        return NextResponse.json(response, {
            headers: {
                'X-Pagination-Page': String(page),
                'X-Pagination-Limit': String(limit),
                'X-Pagination-Total': String(response.pagination.total),
                'X-Pagination-Pages': String(response.pagination.pages),
            }
        });
    } catch (error) {
        logger.error({ error }, 'Error fetching jobs');
        return new NextResponse("Internal server error", { status: 500 });
    }
}
