import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createJobSchema, UserRole, JobCategory } from "@/lib/schemas";
import { createLogger } from "@/lib/logger";
import {
    redis,
    jobPostingRateLimit,
    CACHE_KEYS,
    CACHE_TTL,
    invalidateJobCaches,
    getCachedJobsList,
    cacheJobsList,
    invalidateUserStats
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

        // Create job in database
        const job = await prisma.job.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                category: validatedData.category,
                location: validatedData.location,
                budget: validatedData.budget,
                attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
                customerId: user.id,
                status: "OPEN",
            },
        });

        // Invalidate job feed caches when a new job is created
        if (redis) {
            try {
                await Promise.all([
                    invalidateJobCaches(),
                    invalidateUserStats(user.id, UserRole.CUSTOMER)
                ]);
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
        const location = searchParams.get("location");
        const search = searchParams.get("search");
        const page = parseInt(searchParams.get("page") || "1");
        const limit = 12; // jobs per page

        // Create more comprehensive cache key based on all filters
        const filterParts = [
            category || 'all',
            location || 'all',
            search || 'all',
            page.toString()
        ];
        const filterKey = filterParts.join(':');
        const cacheKey = CACHE_KEYS.JOBS_LIST(filterKey);

        // Try to get from cache first
        const cached = await getCachedJobsList(cacheKey);
        if (cached) {
            return NextResponse.json(typeof cached === 'string' ? JSON.parse(cached) : cached);
        }

        // Build where clause for database query
        const where = {
            status: "OPEN" as const,
            ...(category && { category: category as JobCategory }),
            ...(location && {
                location: {
                    contains: location,
                    mode: "insensitive" as const,
                }
            }),
            ...(search && {
                OR: [
                    {
                        title: {
                            contains: search,
                            mode: "insensitive" as const,
                        }
                    },
                    {
                        description: {
                            contains: search,
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
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.job.count({ where })
        ]);

        const response = {
            jobs,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        };

        // Cache the result with shorter TTL for real-time feel
        await cacheJobsList(cacheKey, response, CACHE_TTL.JOBS_LIST);

        return NextResponse.json(response);
    } catch (error) {
        logger.error({ error }, 'Error fetching jobs');
        return new NextResponse("Internal server error", { status: 500 });
    }
}
