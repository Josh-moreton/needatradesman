import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema, UserRole } from "@/lib/schemas";
import { applicationRateLimit, redis } from "@/lib/redis";
import { unstable_cache, revalidateTag } from "next/cache";
import { createLogger } from "@/lib/logger";

const logger = createLogger('applications-api');

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

        if (user.role !== UserRole.TRADESPERSON) {
            return new NextResponse("Only tradespeople can apply to jobs", { status: 403 });
        }

        // Rate limiting for applications (use clerkId to avoid reuse of internal IDs)
        if (applicationRateLimit) {
            try {
                const { success, limit, reset, remaining } = await applicationRateLimit.limit(user.clerkId);

                if (!success) {
                    const resetDate = new Date(reset);
                    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

                    return new NextResponse(
                        `Rate limit exceeded. You can only submit ${limit} applications per hour. ${remaining} remaining.`,
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
        const { jobId, ...applicationData } = body;

        if (!jobId) {
            return new NextResponse("Job ID is required", { status: 400 });
        }

        const validatedData = createApplicationSchema.parse(applicationData);

        // Check if job exists and is open
        const job = await prisma.job.findUnique({
            where: { id: jobId },
        });

        if (!job) {
            return new NextResponse("Job not found", { status: 404 });
        }

        if (job.status !== "OPEN") {
            return new NextResponse("Job is no longer accepting applications", { status: 400 });
        }

        // Check if user already applied
        const existingApplication = await prisma.application.findUnique({
            where: {
                jobId_tradespersonId: {
                    jobId: job.id,
                    tradespersonId: user.id,
                },
            },
        });

        if (existingApplication) {
            return new NextResponse("You have already applied to this job", { status: 400 });
        }

        // Create application in database
        const application = await prisma.application.create({
            data: {
                message: validatedData.message,
                quote: validatedData.quote,
                quoteItems: validatedData.quoteItems ? JSON.stringify(validatedData.quoteItems) : undefined,
                requiresDeposit: validatedData.requiresDeposit ?? true,
                depositPercentage: validatedData.depositPercentage ?? 50,
                jobId: job.id,
                tradespersonId: user.id,
                status: "PENDING",
            },
            include: {
                tradesperson: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                job: {
                    select: {
                        title: true,
                        customerId: true,
                    },
                },
            },
        });

        // Invalidate relevant caches after application creation
        if (redis) {
            try {
                // Invalidate application caches for both tradesperson and customer
                revalidateTag('applications');
                revalidateTag(`applications-${user.id}`);
                revalidateTag(`applications-${application.job.customerId}`);
                // Also invalidate job list caches as application count has changed
                revalidateTag('jobs');
                revalidateTag('job-detail');
                // Invalidate user stats for both users
                revalidateTag(`user-stats-${user.id}`);
                revalidateTag(`user-stats-${application.job.customerId}`);
                logger.debug('Invalidated caches after application creation');
            } catch (cacheError) {
                logger.error({ error: cacheError }, 'Cache invalidation error');
                // Don't fail the request if cache invalidation fails
            }
        }

        return NextResponse.json(application, { status: 201 });
    } catch (error) {
        logger.error({ error }, 'Error creating application');

        if (error instanceof Error && error.name === "ZodError") {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function GET() {
    try {
        // Check authentication
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Use unstable_cache for caching with Next.js
        const getApplications = unstable_cache(
            async (userId: string, role: string) => {
                let applications;

                if (role === UserRole.TRADESPERSON) {
                    // Get applications submitted by this tradesperson
                    applications = await prisma.application.findMany({
                        where: { tradespersonId: userId },
                        include: {
                            job: {
                                select: {
                                    id: true,
                                    title: true,
                                    category: true,
                                    location: true,
                                    status: true,
                                    customer: {
                                        select: {
                                            firstName: true,
                                            lastName: true,
                                        },
                                    },
                                },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                    });
                } else if (role === UserRole.CUSTOMER) {
                    // Get applications for jobs posted by this customer
                    applications = await prisma.application.findMany({
                        where: {
                            job: {
                                customerId: userId,
                            },
                        },
                        include: {
                            tradesperson: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                            job: {
                                select: {
                                    id: true,
                                    title: true,
                                    category: true,
                                    location: true,
                                    status: true,
                                },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                    });
                } else {
                    throw new Error("Invalid user role");
                }

                return applications;
            },
            ['applications', user.id, user.role],
            {
                revalidate: 180, // 3 minutes for real-time updates
                tags: ['applications', `applications-${user.id}`]
            }
        );

        const applications = await getApplications(user.id, user.role);

        return NextResponse.json(applications);
    } catch (error) {
        logger.error({ error }, "Error fetching applications");
        if (error instanceof Error && error.message === "Invalid user role") {
            return new NextResponse("Invalid user role", { status: 403 });
        }
        return new NextResponse("Internal server error", { status: 500 });
    }
}
