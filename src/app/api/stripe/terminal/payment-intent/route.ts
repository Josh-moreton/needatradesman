import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
    createTerminalPaymentIntent,
    cancelTerminalPaymentIntent,
    calculateCustomerFee,
    calculateTradespersonFee,
    calculateCustomerTotal,
} from "@/lib/stripe";
import { createLogger } from "@/lib/logger";
import { PaymentMethod } from "@prisma/client";

const logger = createLogger("stripe-terminal-payment-intent");

/**
 * Create a payment intent for Terminal payment
 * Used when tradesperson wants to take final payment on-site
 */
export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user from DB
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Only tradespeople can initiate Terminal payments
        if (user.role !== "TRADESPERSON") {
            return NextResponse.json(
                { error: "Only tradespeople can process Terminal payments" },
                { status: 403 }
            );
        }

        // Check if user has Stripe Connect account and Terminal setup
        if (!user.stripeAccountId || !user.terminalReaderId) {
            return NextResponse.json(
                { error: "Terminal setup incomplete" },
                { status: 400 }
            );
        }

        // Parse request body
        const { jobId } = await request.json();

        if (!jobId) {
            return NextResponse.json(
                { error: "Missing required field: jobId" },
                { status: 400 }
            );
        }

        // Fetch job details
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                customer: true,
                applications: {
                    where: {
                        tradespersonId: user.id,
                        status: "ACCEPTED",
                    },
                    take: 1,
                },
            },
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Verify this tradesperson is accepted for this job
        if (job.acceptedTradespersonId !== user.id) {
            return NextResponse.json(
                { error: "You are not the accepted tradesperson for this job" },
                { status: 403 }
            );
        }

        // Check if job is ready for final payment
        if (!job.depositPaid) {
            return NextResponse.json(
                { error: "Deposit must be paid before final payment" },
                { status: 400 }
            );
        }

        if (job.finalPaid) {
            return NextResponse.json(
                { error: "Final payment already completed" },
                { status: 400 }
            );
        }

        // Check if both parties have confirmed completion
        if (!job.customerConfirmedComplete || !job.tradespersonConfirmedComplete) {
            return NextResponse.json(
                { error: "Both parties must confirm job completion before payment" },
                { status: 400 }
            );
        }

        // Get the accepted application to determine amounts
        if (job.applications.length === 0) {
            return NextResponse.json(
                { error: "No accepted application found" },
                { status: 404 }
            );
        }

        const application = job.applications[0];
        const fullAmount = application.quote || job.budget;

        if (!fullAmount) {
            return NextResponse.json(
                { error: "No job amount available" },
                { status: 400 }
            );
        }

        // Calculate payment amounts
        const depositAmount = Number(fullAmount) * (application.depositPercentage / 100);
        const remainingAmount = Number(fullAmount) - depositAmount;

        // Calculate split commission for final payment
        const customerFee = calculateCustomerFee(remainingAmount);
        const tradespersonFee = calculateTradespersonFee(remainingAmount);
        const customerTotal = calculateCustomerTotal(remainingAmount);

        // Create Terminal payment intent
        logger.info(
            {
                jobId: job.id,
                tradespersonId: user.id,
                amount: customerTotal,
            },
            "Creating Terminal payment intent"
        );

        const paymentIntent = await createTerminalPaymentIntent({
            accountId: user.stripeAccountId,
            amount: customerTotal,
            applicationFeeAmount: customerFee + tradespersonFee,
            transferGroup: `job_${jobId}`,
            metadata: {
                jobId: job.id,
                tradespersonId: user.id,
                customerId: job.customerId,
                applicationType: "final_payment",
                paymentMethod: "terminal",
                remainingAmount: remainingAmount.toString(),
                customerFee: customerFee.toString(),
                tradespersonFee: tradespersonFee.toString(),
            },
        });

        // Store payment intent ID temporarily
        await prisma.job.update({
            where: { id: jobId },
            data: {
                terminalPaymentIntentId: paymentIntent.id,
                finalPaymentMethod: PaymentMethod.TERMINAL,
            },
        });

        logger.info(
            { jobId: job.id, paymentIntentId: paymentIntent.id },
            "Terminal payment intent created"
        );

        return NextResponse.json({
            success: true,
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
            amount: customerTotal,
            currency: "gbp",
        });
    } catch (error) {
        logger.error({ error }, "Error creating Terminal payment intent");
        return NextResponse.json(
            {
                error: "Failed to create payment intent",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

/**
 * Cancel a Terminal payment intent
 */
export async function DELETE(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user || user.role !== "TRADESPERSON") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        if (!user.stripeAccountId) {
            return NextResponse.json(
                { error: "Stripe account not set up" },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(request.url);
        const paymentIntentId = searchParams.get("paymentIntentId");

        if (!paymentIntentId) {
            return NextResponse.json(
                { error: "Missing paymentIntentId" },
                { status: 400 }
            );
        }

        // Cancel the payment intent
        await cancelTerminalPaymentIntent({
            accountId: user.stripeAccountId,
            paymentIntentId,
        });

        // Clear from job
        await prisma.job.updateMany({
            where: {
                terminalPaymentIntentId: paymentIntentId,
                acceptedTradespersonId: user.id,
            },
            data: {
                terminalPaymentIntentId: null,
            },
        });

        logger.info(
            { paymentIntentId, userId: user.id },
            "Terminal payment intent cancelled"
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error({ error }, "Error cancelling Terminal payment intent");
        return NextResponse.json(
            { error: "Failed to cancel payment intent" },
            { status: 500 }
        );
    }
}
