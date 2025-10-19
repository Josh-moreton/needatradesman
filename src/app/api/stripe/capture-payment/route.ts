import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-capture-payment");

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
                error: "Deposit has already been captured"
            }, { status: 400 });
        }

        // Check if deposit was cancelled
        if (job.depositCancelledAt) {
            return NextResponse.json({
                error: "Deposit payment was cancelled and cannot be captured"
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

        // Verify payment intent is in a capturable state
        if (paymentIntent.status !== "requires_capture") {
            logger.error({
                jobId,
                paymentIntentId: job.depositPaymentIntentId,
                status: paymentIntent.status
            }, "Payment intent is not in a capturable state");

            return NextResponse.json({
                error: `Payment cannot be captured. Current status: ${paymentIntent.status}`
            }, { status: 400 });
        }

        // Capture the payment
        const capturedPayment = await stripe.paymentIntents.capture(
            job.depositPaymentIntentId
        );

        logger.info({
            jobId,
            paymentIntentId: job.depositPaymentIntentId,
            amount: capturedPayment.amount
        }, "Payment captured successfully");

        // Update job status to mark deposit as captured
        await prisma.job.update({
            where: { id: jobId },
            data: {
                depositCaptured: true,
                depositCapturedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: "Payment captured successfully",
            capturedAt: new Date().toISOString()
        });
    } catch (error) {
        logger.error({ error }, "Error capturing payment");

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
            { error: "Failed to capture payment" },
            { status: 500 }
        );
    }
}
