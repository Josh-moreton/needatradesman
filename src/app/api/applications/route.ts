import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createApplicationSchema, UserRole } from "@/lib/schemas";
import { applicationRateLimit } from "@/lib/redis";
import { unstable_cache, revalidateTag } from "next/cache";
import { createLogger } from "@/lib/logger";
import { emitEmailEvent, EmailEventType } from "@/lib/notifications";
import type { Job } from "@prisma/client";

const logger = createLogger('applications-api');

// Helper function to check rate limits
async function checkRateLimit(clerkId: string): Promise<NextResponse | null> {
    if (!applicationRateLimit) {
        return null;
    }

    try {
        const { success, limit, reset, remaining } = await applicationRateLimit.limit(clerkId);

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
        // Redis connection error - log it and continue
        logger.error({ error }, 'Rate limiter error (likely Redis connection issue)');
    }

    return null;
}

// Helper function to validate job and check if application already exists
async function validateJobAndApplication(jobId: string, userId: string): Promise<{ job: Job } | NextResponse> {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
    });

    if (!job) {
        return new NextResponse("Job not found", { status: 404 });
    }

    if (job.status !== "OPEN") {
        return new NextResponse("Job is no longer accepting applications", { status: 400 });
    }

    const existingApplication = await prisma.application.findUnique({
        where: {
            jobId_tradespersonId: {
                jobId: job.id,
                tradespersonId: userId,
            },
        },
    });

    if (existingApplication) {
        return new NextResponse("You have already applied to this job", { status: 400 });
    }

    return { job };
}

// Helper function to invalidate caches after application creation
async function invalidateCaches(userId: string, customerId: string): Promise<void> {
    try {
        revalidateTag('applications');
        revalidateTag(`applications-${userId}`);
        revalidateTag(`applications-${customerId}`);
        revalidateTag('jobs');
        revalidateTag('job-detail');
        revalidateTag(`user-stats-${userId}`);
        revalidateTag(`user-stats-${customerId}`);
        logger.debug('Invalidated caches after application creation');
    } catch (cacheError) {
        logger.error({ error: cacheError }, 'Cache invalidation error');
    }
}

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

        // Check rate limits
        const rateLimitResponse = await checkRateLimit(user.clerkId);
        if (rateLimitResponse) {
            return rateLimitResponse;
        }

        // Parse and validate request body
        const body = await request.json();
        const { jobId, ...applicationData } = body;

        if (!jobId) {
            return new NextResponse("Job ID is required", { status: 400 });
        }

        const validatedData = createApplicationSchema.parse(applicationData);

        // Validate job and check for existing application
        const validation = await validateJobAndApplication(jobId, user.id);
        if (validation instanceof NextResponse) {
            return validation;
        }
        const { job } = validation;

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
                        customer: {
                            select: {
                                email: true,
                                firstName: true,
                            },
                        },
                    },
                },
            },
        });

        // Send email notification to customer (async, non-blocking)
        emitEmailEvent({
            type: EmailEventType.JOB_RESPONDED,
            jobId: job.id,
            jobTitle: application.job.title,
            customerEmail: application.job.customer.email,
            customerName: application.job.customer.firstName || 'there',
            tradespersonName: (
                `${application.tradesperson.firstName || ''} ${application.tradesperson.lastName || ''}`.trim()
                || application.tradesperson.email
                || 'A tradesperson'
            ),
            message: validatedData.message,
            quote: validatedData.quote ? Number(validatedData.quote) : undefined,
        }).catch((error) => {
            // Don't fail the application creation if email fails
            logger.error({ error }, 'Failed to send job response email');
        });

        // Invalidate caches
        await invalidateCaches(user.id, application.job.customerId);

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
