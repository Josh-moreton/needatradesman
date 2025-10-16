import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

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
            // Mark job as completed and trigger payout process
            await prisma.job.update({
                where: { id: jobId },
                data: { status: "COMPLETED" }
            });

            // If deposit was paid, initiate payout to tradesperson
            if (jobWithCompletionFields.depositPaid && acceptedApplication?.tradesperson.stripeAccountId) {
                try {
                    await initiatePayoutToTradesperson(updatedJob, acceptedApplication);
                } catch (payoutError) {
                    logger.error({ error: payoutError }, "Payout initiation failed");
                    // Job is still marked as completed, but payout failed
                    // This should be handled by admin or retry mechanism
                }
            }
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

// Helper function with proper types for payout initiation
type JobWithId = { id: string; budget?: { toNumber(): number } | null };
type ApplicationWithQuoteAndTradesperson = {
    id: string;
    quote?: { toNumber(): number } | null;
    tradesperson: { stripeAccountId: string | null };
};

async function initiatePayoutToTradesperson(
    job: JobWithId,
    application: ApplicationWithQuoteAndTradesperson
) {
    const tradesperson = application.tradesperson;

    if (!tradesperson.stripeAccountId) {
        throw new Error("Tradesperson Stripe account ID is required for payout");
    }

    // Calculate the amount to transfer: only transfer funds actually received from the customer
    // Fetch all successful payment intents for this job
    const paymentIntents = await stripe.paymentIntents.list({
        limit: 100, // adjust as needed
    });

    // Filter payment intents related to this job (check metadata.jobId)
    const jobPaymentIntents = paymentIntents.data.filter(
        (pi) => pi.status === "succeeded" && pi.metadata && pi.metadata.jobId === job.id
    );

    // Sum the amount received for this job (already in cents from Stripe)
    const totalReceivedCents = jobPaymentIntents.reduce((sum, pi) => sum + (pi.amount_received || 0), 0);

    if (!totalReceivedCents || totalReceivedCents <= 0) {
        throw new Error("No funds received from customer for this job");
    }

    // Only transfer up to the quoted amount (convert to cents if needed)
    const quoteAmountCents = Math.round(Number(application.quote || job.budget) * 100);
    const transferAmount = Math.min(totalReceivedCents, quoteAmountCents);

    // Create a transfer to the tradesperson's Connect account
    // transferAmount is already in cents, no need to multiply by 100 again
    const transfer = await stripe.transfers.create({
        amount: transferAmount, // Already in cents
        currency: "gbp",
        destination: tradesperson.stripeAccountId, // Guaranteed non-null by check above
        metadata: {
            jobId: job.id,
            applicationId: application.id,
            applicationType: "job_completion_payout"
        }
    });

    // Update job with payout information
    await prisma.job.update({
        where: { id: job.id },
        data: {
            payoutTransferId: transfer.id,
            payoutReleased: true,
        },
    });

    logger.info({ jobId: job.id, transferId: transfer.id }, "Payout initiated");
    return transfer;
}