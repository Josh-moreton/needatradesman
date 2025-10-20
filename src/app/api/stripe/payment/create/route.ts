import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-payment-create");

/**
 * Create a PaymentIntent for SC&T model (no instant transfer)
 * POST /api/stripe/payment/create
 * 
 * Used by SC&T payment flow to create a charge on platform account
 * without instant transfer to tradesperson. Transfer happens later
 * via the /payment/release endpoint after cooling-off period.
 */
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, amount, paymentType, tradespersonId, applicationId } = await request.json();

    if (!jobId || !amount || !paymentType || !tradespersonId) {
        return NextResponse.json({
            error: "Missing required fields: jobId, amount, paymentType, tradespersonId"
        }, { status: 400 });
    }

    if (!["deposit", "final_payment"].includes(paymentType)) {
        return NextResponse.json({
            error: "Invalid paymentType. Must be 'deposit' or 'final_payment'"
        }, { status: 400 });
    }

    try {
        // Verify user owns this job
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { customer: true }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        if (job.customer.clerkId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Verify tradesperson exists
        const tradesperson = await prisma.user.findUnique({
            where: { id: tradespersonId }
        });

        if (!tradesperson) {
            return NextResponse.json({ error: "Tradesperson not found" }, { status: 404 });
        }

        // Convert amount to pence
        const amountInPence = Math.round(amount * 100);

        // Create PaymentIntent on platform account (NO transfer_data)
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInPence,
            currency: 'gbp',
            transfer_group: `job_${jobId}`, // For linking payments & transfers
            metadata: {
                jobId,
                tradespersonId,
                paymentType,
                applicationId: applicationId || '',
                chargeModel: 'SC_AND_T',
            },
            // NOTE: No transfer_data - transfer happens later via /payment/release
        });

        logger.info({
            jobId,
            tradespersonId,
            paymentIntentId: paymentIntent.id,
            amount: amountInPence,
            paymentType
        }, "SC&T PaymentIntent created (no instant transfer)");

        return NextResponse.json({
            paymentIntentId: paymentIntent.id,
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        logger.error({ error, jobId, tradespersonId }, "Failed to create PaymentIntent");
        return NextResponse.json(
            { error: "Failed to create payment intent" },
            { status: 500 }
        );
    }
}
