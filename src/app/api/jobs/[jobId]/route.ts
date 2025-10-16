import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";
import { createLogger } from "@/lib/logger";

const logger = createLogger("jobs-jobId-api");

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;

        if (!jobId) {
            return new NextResponse("Job ID is required", { status: 400 });
        }

        // Try to get from cache first
        const cacheKey = CACHE_KEYS.JOB_DETAIL(jobId);

        if (redis) {
            try {
                const cached = await redis.get<string>(cacheKey);
                if (cached) {
                    logger.debug({ cacheKey }, 'Cache hit for job detail');
                    return NextResponse.json(JSON.parse(cached));
                }
            } catch (cacheError) {
                logger.error({ error: cacheError }, 'Cache read error');
            }
        }

        // Get job from database
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                customer: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                applications: {
                    include: {
                        tradesperson: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                },
                _count: {
                    select: {
                        applications: true,
                    },
                },
            },
        });

        if (!job) {
            return new NextResponse("Job not found", { status: 404 });
        }

        // Cache the result
        if (redis) {
            try {
                await redis.set(cacheKey, JSON.stringify(job), { ex: CACHE_TTL.JOB_DETAIL });
                logger.debug({ jobId }, 'Cached job detail');
            } catch (cacheError) {
                logger.error({ error: cacheError }, 'Cache write error');
            }
        }

        return NextResponse.json(job);
    } catch (error) {
        logger.error({ error }, 'Error fetching job');
        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { jobId } = await params;
        const body = await request.json();

        // Update job in database
        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: body,
            include: {
                customer: {
                    select: {
                        id: true,
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
        });

        // Invalidate cache
        if (redis) {
            try {
                const cacheKey = CACHE_KEYS.JOB_DETAIL(jobId);
                await redis.del(cacheKey);
                logger.debug({ cacheKey }, 'Invalidated job detail cache');
            } catch (cacheError) {
                logger.error({ error: cacheError }, 'Cache invalidation error');
            }
        }

        return NextResponse.json(updatedJob);
    } catch (error) {
        logger.error({ error }, "Error updating job");
        return new NextResponse("Internal server error", { status: 500 });
    }
}
