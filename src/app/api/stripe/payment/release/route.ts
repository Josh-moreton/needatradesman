import { NextRequest, NextResponse } from "next/server";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-payment-release");

/**
 * Release payment to tradesperson via Transfer (SC&T model)
 * POST /api/stripe/payment/release
 * 
 * Creates a Transfer from platform account to tradesperson's Stripe Connect account.
 * Called after cooling-off period or customer acceptance.
 * Only works for jobs using SC&T charge model.
 */
export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, paymentType } = await request.json();

    if (!jobId || !paymentType) {
        return NextResponse.json({
            error: "Missing required fields: jobId, paymentType"
        }, { status: 400 });
    }

    if (!["deposit", "final_payment"].includes(paymentType)) {
        return NextResponse.json({
            error: "Invalid paymentType. Must be 'deposit' or 'final_payment'"
        }, { status: 400 });
    }

    try {
        // Get job with related data
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                customer: true,
                applications: {
                    where: { status: "ACCEPTED" },
                    include: { tradesperson: true },
                    take: 1
                }
            }
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Verify requesting user is the customer
        if (job.customer.clerkId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Verify job uses SC&T model
        if (job.chargeModel !== 'SC_AND_T') {
            return NextResponse.json({
                error: "Job does not use SC&T payment model"
            }, { status: 400 });
        }

        const application = job.applications[0];
        if (!application) {
            return NextResponse.json({
                error: "No accepted application found"
            }, { status: 400 });
        }

        const tradesperson = application.tradesperson;
        if (!tradesperson.stripeAccountId) {
            return NextResponse.json({
                error: "Tradesperson has no payment account"
            }, { status: 400 });
        }

        // Check if payment has already been transferred
        if (paymentType === "deposit" && job.depositTransferId) {
            return NextResponse.json({
                error: "Deposit has already been transferred"
            }, { status: 400 });
        }

        if (paymentType === "final_payment" && job.finalTransferId) {
            return NextResponse.json({
                error: "Final payment has already been transferred"
            }, { status: 400 });
        }

        // Get the PaymentIntent to calculate transfer amount
        const paymentIntentId = paymentType === "deposit" 
            ? job.depositPaymentIntentId 
            : job.finalPaymentIntentId;

        if (!paymentIntentId) {
            return NextResponse.json({
                error: `${paymentType === "deposit" ? "Deposit" : "Final"} payment not found`
            }, { status: 400 });
        }

        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return NextResponse.json({
                error: "Payment has not been completed yet"
            }, { status: 400 });
        }

        // Calculate net amount after platform fee
        const grossAmount = paymentIntent.amount; // in pence
        const platformFee = calculatePlatformFee(grossAmount / 100);
        const netAmount = grossAmount - platformFee;

        // Create transfer to tradesperson
        const transfer = await stripe.transfers.create({
            amount: netAmount,
            currency: 'gbp',
            destination: tradesperson.stripeAccountId,
            transfer_group: `job_${jobId}`,
            metadata: {
                jobId,
                tradespersonId: tradesperson.id,
                paymentType,
                applicationId: application.id,
            },
        });

        // Update job record with transfer details
        const updateData = paymentType === "deposit" 
            ? {
                depositTransferId: transfer.id,
                depositReleasedAt: new Date(),
                payoutReleased: true, // Legacy field
            }
            : {
                finalTransferId: transfer.id,
                finalReleasedAt: new Date(),
            };

        await prisma.job.update({
            where: { id: jobId },
            data: updateData,
        });

        logger.info({
            jobId,
            tradespersonId: tradesperson.id,
            transferId: transfer.id,
            netAmount,
            paymentType
        }, "Payment transferred to tradesperson");

        return NextResponse.json({
            transferId: transfer.id,
            amount: netAmount / 100, // Convert back to GBP
            success: true,
        });
    } catch (error) {
        logger.error({ error, jobId, paymentType }, "Failed to release payment");
        return NextResponse.json(
            { error: "Failed to release payment" },
            { status: 500 }
        );
    }
}
