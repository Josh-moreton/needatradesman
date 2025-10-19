import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { invalidateJobCaches } from "@/lib/redis";

const logger = createLogger("complete-job");

/**
 * POST /api/jobs/complete
 * 
 * Marks a job as complete. This should be called when:
 * - Customer confirms work is done to satisfaction
 * - Ready to process final payment to tradesperson
 * 
 * This transitions job from IN_PROGRESS to COMPLETED status.
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Get request body
        const body = await request.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json(
                { error: "Missing jobId" },
                { status: 400 }
            );
        }

        // Get the user from database
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Get the job with accepted application to check deposit requirement
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                customer: true,
                applications: {
                    where: { status: "ACCEPTED" },
                    take: 1,
                },
            },
        });

        if (!job) {
            return NextResponse.json(
                { error: "Job not found" },
                { status: 404 }
            );
        }

        // Verify the user is the customer who owns this job
        if (job.customerId !== user.id) {
            return NextResponse.json(
                { error: "Only the job owner can mark it as complete" },
                { status: 403 }
            );
        }

        // Check if job is in a valid state to be completed
        if (job.status === "COMPLETED") {
            return NextResponse.json(
                { error: "Job is already marked as complete" },
                { status: 400 }
            );
        }

        if (job.status === "CANCELLED") {
            return NextResponse.json(
                { error: "Cannot complete a cancelled job" },
                { status: 400 }
            );
        }

        // Check if there's an accepted tradesperson
        if (!job.acceptedTradespersonId || job.applications.length === 0) {
            return NextResponse.json(
                { error: "No accepted tradesperson for this job" },
                { status: 400 }
            );
        }

        // Get the accepted application to check deposit requirement
        const acceptedApplication = job.applications[0];

        // Check if deposit was paid when required
        if (acceptedApplication.requiresDeposit && !job.depositPaid) {
            return NextResponse.json(
                { error: "Job must have deposit paid before completion" },
                { status: 400 }
            );
        }

        // Update job status to COMPLETED
        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: {
                status: "COMPLETED",
            },
        });

        logger.info({
            jobId: job.id,
            customerId: user.id,
            acceptedTradespersonId: job.acceptedTradespersonId,
        }, "Job marked as complete");

        // Invalidate caches
        await invalidateJobCaches();

        return NextResponse.json({
            success: true,
            message: "Job marked as complete",
            job: {
                id: updatedJob.id,
                status: updatedJob.status,
            },
        });
    } catch (error) {
        logger.error({ error }, "Complete job endpoint failed");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
