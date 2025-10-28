import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

import { createLogger } from "@/lib/logger";

const logger = createLogger("jobs-complete-api");

interface JobWithApplications {
    id: string;
    customerId: string;
    status: string;
    applications: Array<{
        tradespersonId: string;
    }>;
}

/**
 * Validates user authorization for job completion
 */
function validateUserAuthorization(
    job: JobWithApplications,
    userId: string
): { isCustomer: boolean; isTradesperson: boolean } {
    const isCustomer = job.customerId === userId;
    const acceptedApplication = job.applications[0];
    const isTradesperson = acceptedApplication?.tradespersonId === userId;
    
    return { isCustomer, isTradesperson };
}

/**
 * Builds the update data for job completion confirmation
 */
function buildCompletionUpdateData(
    isCustomer: boolean,
    isTradesperson: boolean
): Record<string, boolean | Date> {
    const updateData: Record<string, boolean | Date> = {};
    const now = new Date();

    if (isCustomer) {
        updateData.customerConfirmedComplete = true;
        updateData.customerCompletedAt = now;
    }

    if (isTradesperson) {
        updateData.tradespersonConfirmedComplete = true;
        updateData.tradespersonCompletedAt = now;
    }

    return updateData;
}

/**
 * Checks if both parties have confirmed completion
 */
function areBothPartiesConfirmed(updatedJob: unknown): boolean {
    const jobWithCompletionFields = updatedJob as {
        customerConfirmedComplete: boolean;
        tradespersonConfirmedComplete: boolean;
    };
    
    return Boolean(
        jobWithCompletionFields.customerConfirmedComplete &&
        jobWithCompletionFields.tradespersonConfirmedComplete
    );
}

/**
 * Marks job as completed if both parties have confirmed
 */
async function finalizeJobIfBothConfirmed(jobId: string, bothConfirmed: boolean): Promise<void> {
    if (bothConfirmed) {
        await prisma.job.update({
            where: { id: jobId },
            data: { status: "COMPLETED" }
        });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ jobId: string }> }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { jobId } = await params;

        // Fetch user from DB
        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch job with related data
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                customer: true,
                applications: {
                    where: { status: "ACCEPTED" },
                    include: { tradesperson: true }
                }
            }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Validate user authorization
        const { isCustomer, isTradesperson } = validateUserAuthorization(job, user.id);

        if (!isCustomer && !isTradesperson) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check if job is in progress
        if (job.status !== "IN_PROGRESS") {
            return NextResponse.json(
                { error: "Job must be in progress to mark as complete" },
                { status: 400 }
            );
        }

        // Build and apply completion update
        const updateData = buildCompletionUpdateData(isCustomer, isTradesperson);
        
        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            data: updateData,
        });

        // Check if both parties have confirmed and finalize if needed
        const bothConfirmed = areBothPartiesConfirmed(updatedJob);
        await finalizeJobIfBothConfirmed(jobId, bothConfirmed);

        return NextResponse.json({
            message: isCustomer ? "Customer confirmed completion" : "Tradesperson confirmed completion",
            bothConfirmed,
            jobStatus: bothConfirmed ? "COMPLETED" : "IN_PROGRESS"
        });

    } catch (error) {
        logger.error({ error }, "Error confirming job completion");
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
