import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const headersList = await headers();
        const signature = headersList.get("stripe-signature");
        if (!signature) {
            console.error("Missing stripe-signature header");
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
            console.error(`⚠️ Webhook signature verification failed: ${err}`);
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        console.log(`Event received: ${event.type}`);

        // Handle specific event types
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                if (!session.metadata || !session.metadata.jobId || !session.metadata.tradespersonId) {
                    console.error("Missing metadata in checkout session");
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
                                console.error(`Job ${jobId} already has deposit paid - duplicate payment attempt blocked`);
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

                        console.log(`Deposit payment processed successfully for job ${jobId}`);
                    } catch (transactionError) {
                        console.error("Transaction failed for deposit payment:", transactionError);
                        // Transaction will rollback automatically
                        // Consider alerting admin here
                    }
                }

                // Handle final payment
                else if (applicationType === "final_payment") {
                    await prisma.job.update({
                        where: { id: jobId },
                        data: {
                            finalPaid: true,
                            finalPaymentIntentId: session.payment_intent as string,
                        },
                    });

                    console.log(`Final payment processed for job ${jobId}`);
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
                    console.log(`Account updated for user ${user.id}`);
                    // You could store additional account details if needed
                }

                break;
            }

            default:
                console.log(`Unhandled event type: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error("Webhook error:", error);
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 500 }
        );
    }
}
