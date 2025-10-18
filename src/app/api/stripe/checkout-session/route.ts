import { NextRequest, NextResponse } from "next/server";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { randomUUID } from "crypto";

import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-checkout-session");

export async function POST(request: NextRequest) {
    const correlationId = randomUUID();
    
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { jobId, depositAmount, tradespersonId } = await request.json();

    logger.info(
        { 
            correlationId,
            userId,
            jobId, 
            tradespersonId,
            depositAmount 
        },
        "Checkout session request received"
    );

    if (!jobId || !depositAmount || !tradespersonId) {
        logger.warn(
            { correlationId, jobId, depositAmount, tradespersonId },
            "Missing required fields in checkout session request"
        );
        return NextResponse.json({
            error: "Missing required fields: jobId, depositAmount, tradespersonId"
        }, { status: 400 });
    }

    try {
        // Retrieve job information
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                customer: true,
                applications: {
                    where: { tradespersonId: tradespersonId },
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

        // Get tradesperson info to retrieve their Stripe account ID
        const tradesperson = await prisma.user.findUnique({
            where: { id: tradespersonId }
        });

        if (!tradesperson) {
            return NextResponse.json({
                error: "Tradesperson not found"
            }, { status: 404 });
        }

        // Check if the tradesperson has completed Stripe onboarding
        if (!tradesperson.stripeAccountId) {
            return NextResponse.json({
                error: "Tradesperson has not set up payment details yet"
            }, { status: 400 });
        }

        // CRITICAL: Verify Stripe Connect account is ready to accept charges
        let account;
        try {
            account = await stripe.accounts.retrieve(tradesperson.stripeAccountId);
            logger.info(
                {
                    correlationId,
                    accountId: tradesperson.stripeAccountId,
                    chargesEnabled: account.charges_enabled,
                    detailsSubmitted: account.details_submitted,
                    cardPayments: account.capabilities?.card_payments,
                    requirementsDue: account.requirements?.currently_due?.length || 0,
                },
                "Retrieved Stripe account"
            );
        } catch (error) {
            logger.error(
                { 
                    correlationId,
                    accountId: tradesperson.stripeAccountId,
                    error 
                },
                "Failed to retrieve Stripe account"
            );
            return NextResponse.json({
                code: "STRIPE_ACCOUNT_RETRIEVAL_FAILED",
                error: "Unable to verify tradesperson payment account"
            }, { status: 500 });
        }

        // Check account is fully onboarded and can accept payments
        if (!account.charges_enabled) {
            logger.warn(
                {
                    correlationId,
                    accountId: tradesperson.stripeAccountId,
                },
                "Stripe account does not have charges_enabled"
            );
            return NextResponse.json({
                code: "ACCOUNT_NOT_CHARGEABLE",
                error: "Tradesperson payment account is not yet verified. Please ask them to complete their payout setup."
            }, { status: 409 });
        }

        if (!account.details_submitted) {
            logger.warn(
                {
                    correlationId,
                    accountId: tradesperson.stripeAccountId,
                },
                "Stripe account details not submitted"
            );
            return NextResponse.json({
                code: "ACCOUNT_DETAILS_INCOMPLETE",
                error: "Tradesperson has not completed their account setup"
            }, { status: 409 });
        }

        // Check card_payments capability is active
        if (account.capabilities?.card_payments !== 'active') {
            logger.warn(
                {
                    correlationId,
                    accountId: tradesperson.stripeAccountId,
                    cardPayments: account.capabilities?.card_payments,
                },
                "Stripe account card_payments capability not active"
            );
            return NextResponse.json({
                code: "ACCOUNT_NOT_CHARGEABLE",
                error: "Tradesperson account cannot accept card payments yet. Please ask them to complete their verification."
            }, { status: 409 });
        }

        // Check for outstanding requirements
        if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
            logger.warn(
                { 
                    correlationId,
                    accountId: tradesperson.stripeAccountId,
                    requirements: account.requirements.currently_due 
                },
                "Stripe account has outstanding requirements"
            );
            return NextResponse.json({
                code: "ACCOUNT_REQUIREMENTS_PENDING",
                error: "Tradesperson account has pending verification requirements. Please ask them to complete their account setup."
            }, { status: 409 });
        }

        // Determine the application
        if (job.applications.length === 0) {
            return NextResponse.json({
                error: "No application found for this tradesperson on this job"
            }, { status: 400 });
        }

        const application = job.applications[0];

        // Calculate full job amount and deposit (50% or custom amount)
        const fullAmount = application.quote || job.budget;

        if (!fullAmount) {
            return NextResponse.json({
                error: "No job budget or quote amount available"
            }, { status: 400 });
        }

        // Use the provided deposit amount (should already be calculated)
        const deposit = depositAmount;

        // Format for Stripe (amount in cents/pennies)
        const formattedDepositAmount = Math.round(deposit * 100);

        // Get origin for success/cancel URLs
        const origin = request.headers.get("origin") || "http://localhost:3000";

        // Calculate deposit percentage for display
        const depositPercentage = Math.round((deposit / Number(fullAmount)) * 100);

        // Calculate platform fee (10% of deposit)
        const platformFee = calculatePlatformFee(deposit);

        // Create a Checkout Session with Stripe Connect
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "gbp",
                        product_data: {
                            name: `Deposit for ${job.title}`,
                            description: `${depositPercentage}% deposit to book this job`,
                        },
                        unit_amount: formattedDepositAmount,
                    },
                    quantity: 1,
                },
            ],
            payment_intent_data: {
                application_fee_amount: platformFee,
                transfer_data: {
                    destination: tradesperson.stripeAccountId,
                },
            },
            metadata: {
                jobId: job.id,
                tradespersonId: tradespersonId,
                applicationType: "deposit",
                applicationId: application.id,
                platformFee: platformFee.toString(),
                correlationId,
            },
            success_url: `${origin}/customer/jobs/${jobId}?payment_success=true`,
            cancel_url: `${origin}/customer/jobs/${jobId}?payment_cancelled=true`,
        });

        logger.info(
            {
                correlationId,
                sessionId: session.id,
                jobId,
                tradespersonId,
                applicationId: application.id,
                depositAmount,
            },
            "Checkout session created successfully"
        );

        // Return the session URL
        return NextResponse.json({ url: session.url });
    } catch (error) {
        logger.error(
            { 
                correlationId,
                error,
                jobId,
                tradespersonId,
            },
            "Error creating checkout session"
        );
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
