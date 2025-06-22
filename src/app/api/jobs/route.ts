import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createJobSchema, UserRole, JobCategory } from "@/lib/schemas";
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

        // Rate limiting for job posting
        if (jobPostingRateLimit) {
            try {
                await jobPostingRateLimit.consume(user.id);
            } catch (rejRes: unknown) {
                return new NextResponse("Rate limit exceeded. You can only post 3 jobs per hour.", {
                    status: 429,
                    headers: {
                        'Retry-After': typeof rejRes === 'object' && rejRes && 'msBeforeNext' in rejRes ? String(Math.ceil((rejRes as { msBeforeNext: number }).msBeforeNext / 1000)) : '60',
                    }
                });
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
                console.log('Invalidated job feed caches and user stats after job creation');
            } catch (cacheError) {
                console.error('Cache invalidation error:', cacheError);
                // Don't fail the request if cache invalidation fails
            }
        }

        return NextResponse.json(job, { status: 201 });
    } catch (error) {
        console.error("Error creating job:", error);

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
        console.error("Error fetching jobs:", error);
        return new NextResponse("Internal server error", { status: 500 });
    }
}
