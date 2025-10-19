import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-cancel-payment");

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { jobId } = await request.json();

        if (!jobId) {
            return NextResponse.json({
                error: "Missing required field: jobId"
            }, { status: 400 });
        }

        // Retrieve job information
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                customer: true,
            }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Verify that the requesting user is the customer of this job
        if (job.customer.clerkId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check if deposit has already been captured
        if (job.depositCaptured) {
            return NextResponse.json({
                error: "Deposit has already been captured and cannot be cancelled"
            }, { status: 400 });
        }

        // Check if deposit was already cancelled
        if (job.depositCancelledAt) {
            return NextResponse.json({
                error: "Deposit payment has already been cancelled"
            }, { status: 400 });
        }

        // Check if payment intent exists
        if (!job.depositPaymentIntentId) {
            return NextResponse.json({
                error: "No deposit payment found for this job"
            }, { status: 400 });
        }

        // Retrieve the payment intent to check its status
        const paymentIntent = await stripe.paymentIntents.retrieve(
            job.depositPaymentIntentId
        );

        // Verify payment intent can be cancelled
        if (paymentIntent.status !== "requires_capture") {
            logger.error({
                jobId,
                paymentIntentId: job.depositPaymentIntentId,
                status: paymentIntent.status
            }, "Payment intent cannot be cancelled");

            return NextResponse.json({
                error: `Payment cannot be cancelled. Current status: ${paymentIntent.status}`
            }, { status: 400 });
        }

        // Cancel the payment intent
        await stripe.paymentIntents.cancel(
            job.depositPaymentIntentId
        );

        logger.info({
            jobId,
            paymentIntentId: job.depositPaymentIntentId
        }, "Payment cancelled successfully");

        // Update job status to mark deposit as cancelled
        await prisma.job.update({
            where: { id: jobId },
            data: {
                depositCancelledAt: new Date(),
                depositPaid: false,
                status: "OPEN",
                acceptedTradespersonId: null,
            },
        });

        // Reset the application status back to pending
        await prisma.application.updateMany({
            where: {
                jobId: jobId,
                status: "ACCEPTED",
            },
            data: {
                status: "PENDING",
            },
        });

        // Reset rejected applications as well to allow re-selection
        await prisma.application.updateMany({
            where: {
                jobId: jobId,
                status: "REJECTED",
            },
            data: {
                status: "PENDING",
            },
        });

        return NextResponse.json({
            success: true,
            message: "Payment cancelled successfully",
            cancelledAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error({ error }, "Error cancelling payment");

        // Handle specific Stripe errors
        if (error && typeof error === 'object' && 'type' in error) {
            const stripeError = error as { type: string; message?: string };
            if (stripeError.type === 'StripeInvalidRequestError') {
                return NextResponse.json(
                    { error: stripeError.message || "Invalid request to Stripe" },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { error: "Failed to cancel payment" },
            { status: 500 }
        );
    }
}
