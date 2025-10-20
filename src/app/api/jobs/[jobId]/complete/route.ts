import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

import { createLogger } from "@/lib/logger";

const logger = createLogger("jobs-complete-api");

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

        // Check if user is either the customer or the accepted tradesperson
        const isCustomer = job.customerId === user.id;
        const acceptedApplication = job.applications[0];
        const isTradesperson = acceptedApplication?.tradespersonId === user.id;

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

        // Update completion status based on user role
        // Using Record type to ensure type safety for dynamic updates
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

        // Update the job
        const updatedJob = await prisma.job.update({
            where: { id: jobId },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            data: updateData as any, // Prisma type inference limitation with dynamic field updates
        });

        // Check if both parties have confirmed completion
        // These fields exist on the Job model but TypeScript needs help inferring them after update
        const jobWithCompletionFields = updatedJob as unknown as {
            customerConfirmedComplete: boolean;
            tradespersonConfirmedComplete: boolean;
            depositPaid: boolean;
        };
        const bothConfirmed = Boolean(
            jobWithCompletionFields.customerConfirmedComplete &&
            jobWithCompletionFields.tradespersonConfirmedComplete
        );

        if (bothConfirmed) {
            // Mark job as completed
            await prisma.job.update({
                where: { id: jobId },
                data: { status: "COMPLETED" }
            });
        }

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