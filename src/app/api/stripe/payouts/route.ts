import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-gate";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/schemas";
import { stripe } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-payouts-api");

export async function GET() {
    try {
        const gate = await requireRole(UserRole.TRADESPERSON);

        // Get the current user with their Stripe account
        const user = await prisma.user.findUnique({
            where: { clerkId: gate.clerkId },
            select: {
                id: true,
                role: true,
                stripeAccountId: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (!user.stripeAccountId) {
            return NextResponse.json(
                { error: "Stripe account not connected" },
                { status: 400 }
            );
        }

        // Fetch transfers from Stripe for this connected account
        // Transfers are the payouts sent to the tradesperson's Stripe account
        const transfers = await stripe.transfers.list({
            destination: user.stripeAccountId,
            limit: 20, // Show last 20 transfers
            expand: ["data.destination_payment"],
        });

        // Also fetch the jobs associated with these transfers
        const transfersWithJobs = await Promise.all(
            transfers.data.map(async (transfer) => {
                // Find the job associated with this transfer
                const job = await prisma.job.findFirst({
                    where: {
                        OR: [
                            { depositPaymentIntentId: transfer.source_transaction as string },
                            { finalPaymentIntentId: transfer.source_transaction as string },
                        ],
                    },
                    select: {
                        id: true,
                        title: true,
                        depositPaid: true,
                        finalPaid: true,
                    },
                });

                return {
                    id: transfer.id,
                    amount: transfer.amount,
                    currency: transfer.currency,
                    created: transfer.created,
                    description: transfer.description,
                    status: transfer.destination_payment
                        ? "paid"
                        : "pending",
                    job: job
                        ? {
                            id: job.id,
                            title: job.title,
                            paymentType: job.finalPaid ? "final" : "deposit",
                        }
                        : null,
                };
            })
        );

        logger.info(
            { userId: user.id, count: transfersWithJobs.length },
            "Payouts fetched successfully"
        );

        return NextResponse.json({ payouts: transfersWithJobs });
    } catch (error) {
        logger.error({ error }, "Error fetching payouts");
        return NextResponse.json(
            { error: "Failed to fetch payouts" },
            { status: 500 }
        );
    }
}
