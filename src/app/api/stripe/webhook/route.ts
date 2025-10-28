import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { ChargeModel } from "@prisma/client";
import { headers } from "next/headers";
import { createLogger } from "@/lib/logger";
import {
    webhookRateLimit,
    trackWebhookFailure,
    isWebhookFailureThresholdExceeded,
    isWebhookProcessed,
    markWebhookProcessed
} from "@/lib/redis";

const logger = createLogger('stripe-webhook');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Extract payment intent ID from Stripe session
 * Handles both string and PaymentIntent object types
 */
function extractPaymentIntentId(paymentIntent: string | Stripe.PaymentIntent): string {
    return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
}

/**
 * Extract charge ID from payment intent
 * Handles string, Charge object, and null types
 */
function extractChargeId(latestCharge: string | Stripe.Charge | null): string | null {
    if (!latestCharge) {
        return null;
    }
    return typeof latestCharge === 'string' ? latestCharge : latestCharge.id;
}

/**
 * Process deposit payment for a job
 */
async function processDepositPayment(
    jobId: string,
    tradespersonId: string,
    applicationId: string | undefined,
    session: Stripe.Checkout.Session
) {
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

            // Ensure payment_intent exists before proceeding
            if (!session.payment_intent) {
                throw new Error('Payment intent is missing from session');
            }

            // Extract payment intent ID (can be string or object)
            const paymentIntentId = extractPaymentIntentId(session.payment_intent);

            // Retrieve payment intent to get charge and transfer details
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            // Extract charge ID (can be string, Charge object, or null)
            const chargeId = extractChargeId(paymentIntent.latest_charge);

            // 2. Update job status and store payment information atomically
            await tx.job.update({
                where: { id: jobId },
                data: {
                    status: "IN_PROGRESS",
                    depositPaid: true,
                    depositPaymentIntentId: paymentIntentId,
                    acceptedTradespersonId: tradespersonId,
                    // New payment tracking fields
                    depositChargeId: chargeId,
                    transferGroup: paymentIntent.transfer_group || `job_${jobId}`,
                    chargeModel: ChargeModel.DESTINATION_CHARGE,
                    // For DESTINATION_CHARGE: transfer is created immediately and automatically
                    // by Stripe at payment time (via transfer_data in checkout session).
                    // For future SC_AND_T: this will be set when we manually create the transfer.
                    depositReleasedAt: new Date(),
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

/**
 * Process final payment for a job
 */
async function processFinalPayment(
    jobId: string,
    session: Stripe.Checkout.Session
) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Check if job already has final payment (prevent race condition)
            const currentJob = await tx.job.findUnique({
                where: { id: jobId },
                select: { finalPaid: true, finalPaymentIntentId: true, transferGroup: true }
            });

            if (currentJob?.finalPaid) {
                logger.error({
                    jobId,
                    sessionId: session.id
                }, "Race condition blocked - job already has final payment paid");
                throw new Error('Job already has final payment processed');
            }

            // Ensure payment_intent exists before proceeding
            if (!session.payment_intent) {
                throw new Error('Payment intent is missing from session');
            }

            // Extract payment intent ID (can be string or object)
            const paymentIntentId = extractPaymentIntentId(session.payment_intent);

            // Retrieve payment intent to get charge and transfer details
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            // Extract charge ID (can be string, Charge object, or null)
            const chargeId = extractChargeId(paymentIntent.latest_charge);

            // 2. Update job with final payment information atomically
            await tx.job.update({
                where: { id: jobId },
                data: {
                    finalPaid: true,
                    finalPaymentIntentId: paymentIntentId,
                    // New payment tracking fields
                    finalChargeId: chargeId,
                    // For DESTINATION_CHARGE: transfer is created immediately and automatically
                    // by Stripe at payment time (via transfer_data in checkout session).
                    // For future SC_AND_T: this will be set when we manually create the transfer.
                    finalReleasedAt: new Date(),
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

export async function POST(request: NextRequest) {
    try {
        // Get client identifier for rate limiting and failure tracking
        const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
            request.headers.get('x-real-ip') ||
            'unknown';

        // Rate limiting for webhook endpoint
        if (webhookRateLimit) {
            try {
                const { success, limit, reset, remaining } = await webhookRateLimit.limit(clientIp);

                if (!success) {
                    const resetDate = new Date(reset);
                    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

                    logger.warn({
                        ip: clientIp,
                        limit,
                        remaining
                    }, 'Webhook rate limit exceeded');

                    return new NextResponse(
                        'Rate limit exceeded',
                        {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit': String(limit),
                                'X-RateLimit-Remaining': String(remaining),
                                'X-RateLimit-Reset': String(reset),
                                'Retry-After': String(retryAfter),
                            }
                        }
                    );
                }
            } catch (error) {
                // Log rate limiter error but continue processing
                logger.error({ error }, 'Webhook rate limiter error (likely Redis connection issue)');
            }
        }

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
            // Track signature verification failure
            const failureCount = await trackWebhookFailure(clientIp);

            // Check if threshold exceeded - potential attack
            if (isWebhookFailureThresholdExceeded(failureCount)) {
                logger.error({
                    ip: clientIp,
                    failureCount,
                    error: err
                }, '🚨 SECURITY ALERT: Multiple webhook signature verification failures - possible attack');

                // Note: Consider integrating with monitoring service here
                // Example: Sentry.captureException(err, { tags: { security_alert: true, ip: clientIp } });
            } else {
                logger.error({
                    error: err,
                    ip: clientIp,
                    failureCount
                }, "Webhook signature verification failed");
            }

            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        logger.info({ eventType: event.type, eventId: event.id }, "Stripe event received");

        // Check if event already processed (using Redis as primary check)
        const redisProcessed = await isWebhookProcessed(event.id);

        if (redisProcessed) {
            logger.info({ eventId: event.id, eventType: event.type }, 'Webhook event already processed (Redis check)');
            return NextResponse.json({
                received: true,
                skipped: true,
                reason: 'already_processed'
            });
        }

        // Fallback to database check if Redis is unavailable
        const dbProcessed = await prisma.webhookEvent.findUnique({
            where: { id: event.id }
        });

        if (dbProcessed) {
            logger.info({ eventId: event.id, eventType: event.type }, 'Webhook event already processed (Database check)');
            // Also update Redis cache for future checks
            await markWebhookProcessed(event.id);
            return NextResponse.json({
                received: true,
                skipped: true,
                reason: 'already_processed'
            });
        }

        // Handle specific event types
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object;

                if (!session.metadata?.jobId || !session.metadata?.tradespersonId) {
                    logger.error("Missing metadata in checkout session");
                    break;
                }

                const { jobId, tradespersonId, applicationType, applicationId } = session.metadata;

                // Handle deposit payment with atomic transaction
                if (applicationType === "deposit") {
                    await processDepositPayment(jobId, tradespersonId, applicationId, session);
                }
                // Handle final payment with atomic transaction
                else if (applicationType === "final_payment") {
                    await processFinalPayment(jobId, session);
                }

                break;
            }

            case "account.updated": {
                const account = event.data.object;

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

        // Mark event as processed (24h TTL in Redis)
        await markWebhookProcessed(event.id);

        // Store in database as fallback
        try {
            await prisma.webhookEvent.create({
                data: {
                    id: event.id,
                    processed: true,
                }
            });
            logger.debug({ eventId: event.id }, 'Webhook event stored in database');
        } catch (dbError) {
            // Ignore duplicate key errors (race condition where same event was stored)
            // This is expected and handled by idempotency check
            logger.debug({ eventId: event.id, error: dbError }, 'Database storage skipped (likely duplicate)');
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
