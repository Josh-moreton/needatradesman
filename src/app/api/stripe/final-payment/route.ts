import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { FEATURES } from "@/lib/feature-flags";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-final-payment");

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { jobId } = await request.json();

    if (!jobId) {
        return NextResponse.json({
            error: "Missing required field: jobId"
        }, { status: 400 });
    }

    try {
        // Fetch user from DB
        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Retrieve job information
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

        // Verify that the requesting user is the customer of this job
        if (job.customer.clerkId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check if job is completed
        if (job.status !== "COMPLETED") {
            return NextResponse.json(
                { error: "Job must be completed before final payment" },
                { status: 400 }
            );
        }

        // Check if final payment has already been made
        if (job.finalPaid) {
            return NextResponse.json(
                { error: "Final payment has already been made" },
                { status: 400 }
            );
        }

        // Get the accepted application
        const application = job.applications[0];
        if (!application) {
            return NextResponse.json(
                { error: "No accepted application found" },
                { status: 400 }
            );
        }

        // Calculate final payment amount
        const fullAmount = application.quote || job.budget;
        if (!fullAmount) {
            return NextResponse.json(
                { error: "No job budget or quote amount available" },
                { status: 400 }
            );
        }

        let finalAmount: number;
        let depositAmount = 0; // Initialize to 0 for no-deposit scenarios

        if (application.requiresDeposit) {
            // Deposit was required - calculate remaining balance after deposit
            const depositPercentage = application.depositPercentage / 100;
            depositAmount = Number(fullAmount) * depositPercentage;
            finalAmount = Number(fullAmount) - depositAmount;

            if (finalAmount <= 0) {
                return NextResponse.json(
                    { error: "No remaining balance to pay" },
                    { status: 400 }
                );
            }
        } else {
            // No deposit required - pay the full amount
            depositAmount = 0;
            finalAmount = Number(fullAmount);
        }

        // Format for Stripe (amount in cents/pennies)
        const formattedAmount = Math.round(finalAmount * 100);

        // Calculate platform fee for final payment
        const platformFee = calculatePlatformFee(finalAmount);

        // Verify tradesperson's Stripe account is still active
        const tradesperson = application.tradesperson;
        if (!tradesperson.stripeAccountId) {
            return NextResponse.json({
                error: "Tradesperson payment account not found"
            }, { status: 400 });
        }

        try {
            const account = await stripe.accounts.retrieve(tradesperson.stripeAccountId);
            if (!account.charges_enabled || !account.details_submitted) {
                return NextResponse.json({
                    error: "Tradesperson payment account is not ready"
                }, { status: 400 });
            }
        } catch (error) {
            logger.error({ error }, "Failed to verify tradesperson account");
            return NextResponse.json({
                error: "Unable to verify payment account"
            }, { status: 500 });
        }

        // Get origin for success/cancel URLs
        const origin = request.headers.get("origin") || "http://localhost:3000";

        // Prepare payment descriptions
        const paymentName = application.requiresDeposit
            ? `Final Payment - ${job.title}`
            : `Full Payment - ${job.title}`;
        const paymentDescription = application.requiresDeposit
            ? `Remaining balance for completed job: ${job.title}`
            : `Full payment for completed job: ${job.title}`;

        // Determine available payment methods
        // Enable bank transfer (BACS) for payments >= £1000
        const paymentMethodTypes = ["card", "klarna", "afterpay_clearpay"] as const;
        const allPaymentMethods = finalAmount >= 1000
            ? [...paymentMethodTypes, "bacs_debit"] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[]
            : [...paymentMethodTypes] as Stripe.Checkout.SessionCreateParams.PaymentMethodType[];

        // Create a Checkout Session for final payment with Connect
        let session: Stripe.Checkout.Session;

        if (FEATURES.USE_SC_AND_T) {
            // NEW: SC&T model - charge platform account, transfer later
            logger.info({ jobId, tradespersonId: application.tradespersonId }, "Using SC&T payment model for final payment");

            session = await stripe.checkout.sessions.create({
                payment_method_types: allPaymentMethods,
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: "gbp",
                            product_data: {
                                name: paymentName,
                                description: paymentDescription,
                            },
                            unit_amount: formattedAmount,
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: {
                    // NO application_fee_amount - we're not using Stripe Connect fees for SC&T
                    // Platform takes commission from the transfer amount later
                    transfer_group: `job_${jobId}`,
                    metadata: {
                        jobId: job.id,
                        applicationId: application.id,
                        tradespersonId: application.tradespersonId,
                        applicationType: "final_payment",
                        depositAmount: depositAmount.toString(),
                        finalAmount: finalAmount.toString(),
                        platformFee: platformFee.toString(),
                        requiresDeposit: application.requiresDeposit.toString(),
                        chargeModel: 'SC_AND_T',
                    },
                    // NO transfer_data - we'll transfer later via /api/stripe/payment/release
                },
                success_url: `${origin}/dashboard/jobs/${jobId}?final_payment_success=true`,
                cancel_url: `${origin}/dashboard/jobs/${jobId}?final_payment_cancelled=true`,
                metadata: {
                    jobId: job.id,
                    applicationId: application.id,
                    tradespersonId: application.tradespersonId,
                    applicationType: "final_payment",
                    depositAmount: depositAmount.toString(),
                    finalAmount: finalAmount.toString(),
                    platformFee: platformFee.toString(),
                    requiresDeposit: application.requiresDeposit.toString(),
                },
            });
        } else {
            // EXISTING: Destination Charges - instant transfer via transfer_data
            logger.info({ jobId, tradespersonId: application.tradespersonId }, "Using Destination Charges model for final payment");

            session = await stripe.checkout.sessions.create({
                payment_method_types: allPaymentMethods,
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: "gbp",
                            product_data: {
                                name: paymentName,
                                description: paymentDescription,
                            },
                            unit_amount: formattedAmount,
                        },
                        quantity: 1,
                    },
                ],
                payment_intent_data: {
                    application_fee_amount: platformFee,
                    transfer_group: `job_${jobId}`,
                    transfer_data: {
                        destination: tradesperson.stripeAccountId,
                    },
                },
                success_url: `${origin}/dashboard/jobs/${jobId}?final_payment_success=true`,
                cancel_url: `${origin}/dashboard/jobs/${jobId}?final_payment_cancelled=true`,
                metadata: {
                    jobId: job.id,
                    applicationId: application.id,
                    tradespersonId: application.tradespersonId,
                    applicationType: "final_payment",  // Fixed: matches webhook check
                    depositAmount: depositAmount.toString(),
                    finalAmount: finalAmount.toString(),
                    platformFee: platformFee.toString(),
                    requiresDeposit: application.requiresDeposit.toString(),
                },
            });
        }

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
            amount: finalAmount
        });

    } catch (error) {
        logger.error({ error }, "Error creating final payment session");
        return NextResponse.json(
            { error: "Failed to create payment session" },
            { status: 500 }
        );
    }
}