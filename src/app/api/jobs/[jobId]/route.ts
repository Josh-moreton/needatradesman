import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { unstable_cache, revalidateTag } from "next/cache";
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

        // Use unstable_cache for caching with Next.js
        const getJobDetail = unstable_cache(
            async (id: string) => {
                // Get job from database
                const job = await prisma.job.findUnique({
                    where: { id },
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

                return job;
            },
            ['job-detail'],
            {
                revalidate: 300, // 5 minutes
                tags: ['job-detail', `job-${jobId}`]
            }
        );

        const job = await getJobDetail(jobId);

        if (!job) {
            return new NextResponse("Job not found", { status: 404 });
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

        // Invalidate cache using Next.js tags
        revalidateTag('job-detail');
        revalidateTag(`job-${jobId}`);
        revalidateTag('jobs');
        logger.debug({ jobId }, 'Invalidated job caches');

        return NextResponse.json(updatedJob);
    } catch (error) {
        logger.error({ error }, "Error updating job");
        return new NextResponse("Internal server error", { status: 500 });
    }
}
