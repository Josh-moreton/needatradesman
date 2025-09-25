import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-05-28.basil",
});

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

                // Handle deposit payment
                if (applicationType === "deposit") {
                    // Update job status and store payment information
                    await prisma.job.update({
                        where: { id: jobId },
                        data: {
                            status: "IN_PROGRESS",
                            depositPaid: true,
                            depositPaymentIntentId: session.payment_intent as string,
                            acceptedTradespersonId: tradespersonId,
                        },
                    });

                    // Update application status
                    if (applicationId) {
                        await prisma.application.update({
                            where: { id: applicationId },
                            data: {
                                status: "ACCEPTED",
                            },
                        });

                        // Reject all other applications for this job
                        await prisma.application.updateMany({
                            where: {
                                jobId: jobId,
                                id: { not: applicationId },
                            },
                            data: {
                                status: "REJECTED",
                            },
                        });
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

                    // Initiate transfer to tradesperson if job is completed
                    const job = await prisma.job.findUnique({
                        where: { id: jobId },
                        include: {
                            applications: {
                                where: { status: "ACCEPTED" },
                                include: { tradesperson: true }
                            }
                        }
                    });

                    if (job && job.status === "COMPLETED" && job.applications[0]?.tradesperson.stripeAccountId) {
                        try {
                            const transferAmount = session.metadata?.finalAmount;
                            if (transferAmount) {
                                const transfer = await stripe.transfers.create({
                                    amount: Math.round(Number(transferAmount) * 100),
                                    currency: "gbp",
                                    destination: job.applications[0].tradesperson.stripeAccountId,
                                    metadata: {
                                        jobId: jobId,
                                        applicationId: applicationId || "",
                                        type: "final_payment_transfer"
                                    }
                                });
                                console.log(`Final payment transfer initiated: ${transfer.id}`);
                            }
                        } catch (transferError) {
                            console.error("Failed to initiate final payment transfer:", transferError);
                        }
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
                    console.log(`Account updated for user ${user.id}`);
                    // You could store additional account details if needed
                }

                break;
            }

            case "transfer.paid": {
                const transfer = event.data.object as Stripe.Transfer;
                
                // Update job payout status if this is a job completion transfer
                if (transfer.metadata?.type === "job_completion_payout" && transfer.metadata?.jobId) {
                    await prisma.job.update({
                        where: { id: transfer.metadata.jobId },
                        data: {
                            payoutReleased: true,
                            payoutTransferId: transfer.id,
                        }
                    });
                    console.log(`Payout completed for job ${transfer.metadata.jobId}: ${transfer.id}`);
                }

                break;
            }
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
