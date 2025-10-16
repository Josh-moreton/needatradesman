import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { createLogger } from "@/lib/logger";

const logger = createLogger('stripe-webhook');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const headersList = await headers();
        const signature = headersList.get("stripe-signature");
        if (!signature) {
            logger.error("Missing stripe-signature header");
            return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
        }

        // Verify webhook signature
        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(
                body,
                signature,
                webhookSecret
            );
        } catch (err) {
            logger.error({ error: err }, "Webhook signature verification failed");
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        logger.info({ eventType: event.type }, "Stripe event received");

        // Handle specific event types
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                if (!session.metadata || !session.metadata.jobId || !session.metadata.tradespersonId) {
                    logger.error("Missing metadata in checkout session");
                    break;
                }

                const { jobId, tradespersonId, applicationType, applicationId } = session.metadata;

                // Handle deposit payment with atomic transaction
                if (applicationType === "deposit") {
                    try {
                        await prisma.$transaction(async (tx) => {
                            // 1. Check if job already has accepted tradesperson (prevent race condition)
                            const currentJob = await tx.job.findUnique({
                                where: { id: jobId },
                                select: { depositPaid: true, acceptedTradespersonId: true }
                            });

                            if (currentJob?.depositPaid) {
                                logger.error({ 
                                    jobId, 
                                    tradespersonId, 
                                    sessionId: session.id 
                                }, "Race condition blocked - job already has deposit paid");
                                throw new Error('Job already has accepted tradesperson');
                            }

                            // 2. Update job status and store payment information atomically
                            await tx.job.update({
                                where: { id: jobId },
                                data: {
                                    status: "IN_PROGRESS",
                                    depositPaid: true,
                                    depositPaymentIntentId: session.payment_intent as string,
                                    acceptedTradespersonId: tradespersonId,
                                },
                            });

                            // 3. Update application status
                            if (applicationId) {
                                await tx.application.update({
                                    where: { id: applicationId },
                                    data: {
                                        status: "ACCEPTED",
                                    },
                                });

                                // 4. Reject all other applications for this job
                                await tx.application.updateMany({
                                    where: {
                                        jobId: jobId,
                                        id: { not: applicationId },
                                    },
                                    data: {
                                        status: "REJECTED",
                                    },
                                });
                            }
                        });

                        logger.info({ 
                            jobId, 
                            tradespersonId, 
                            sessionId: session.id 
                        }, "Deposit payment processed successfully");
                    } catch (transactionError) {
                        logger.error({ 
                            jobId, 
                            tradespersonId, 
                            error: transactionError 
                        }, "Transaction failed for deposit payment");
                        // Transaction will rollback automatically
                        // Consider alerting admin here for non-race-condition errors
                    }
                }

                // Handle final payment with atomic transaction
                else if (applicationType === "final_payment") {
                    try {
                        await prisma.$transaction(async (tx) => {
                            // 1. Check if job already has final payment (prevent race condition)
                            const currentJob = await tx.job.findUnique({
                                where: { id: jobId },
                                select: { finalPaid: true, finalPaymentIntentId: true }
                            });

                            if (currentJob?.finalPaid) {
                                logger.error({ 
                                    jobId, 
                                    sessionId: session.id 
                                }, "Race condition blocked - job already has final payment paid");
                                throw new Error('Job already has final payment processed');
                            }

                            // 2. Update job with final payment information atomically
                            await tx.job.update({
                                where: { id: jobId },
                                data: {
                                    finalPaid: true,
                                    finalPaymentIntentId: session.payment_intent as string,
                                },
                            });
                        });

                        logger.info({ 
                            jobId, 
                            sessionId: session.id 
                        }, "Final payment processed successfully");
                    } catch (transactionError) {
                        logger.error({ 
                            jobId, 
                            error: transactionError 
                        }, "Transaction failed for final payment");
                        // Transaction will rollback automatically
                        // Consider alerting admin here for non-race-condition errors
                    }
                }

                break;
            }

            case "account.updated": {
                const account = event.data.object as Stripe.Account;

                // Find user with this Stripe account ID
                const user = await prisma.user.findFirst({
                    where: { stripeAccountId: account.id }
                });

                if (user) {
                    logger.info({ userId: user.id }, "Stripe account updated for user");
                    // You could store additional account details if needed
                }

                break;
            }

            default:
                logger.debug({ eventType: event.type }, "Unhandled Stripe event type");
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        logger.error({ error }, "Webhook handler failed");
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        );
    }
}
