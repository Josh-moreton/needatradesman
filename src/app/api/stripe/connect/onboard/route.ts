import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe"; // Use centralized Stripe instance
import Stripe from "stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger('stripe-connect-onboard');

export async function POST(request: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user from DB
        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        let stripeAccountId = user.stripeAccountId;

        // If no Stripe account, create one
        if (!stripeAccountId) {
            logger.info({ userEmail: user.email }, "Creating new Stripe Connect account");
            const account = await stripe.accounts.create({
                type: "express",
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                settings: {
                    payouts: {
                        schedule: {
                            interval: 'manual'
                        }
                    }
                }
            });
            stripeAccountId = account.id;
            logger.info({ stripeAccountId }, "Created Stripe account");

            // Save to DB
            await prisma.user.update({
                where: { clerkId: userId },
                data: { stripeAccountId },
            });
        }

        // Create onboarding link
        const origin = request.headers.get("origin") || "http://localhost:3000";
        logger.debug({ stripeAccountId }, "Creating account link");

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${origin}/dashboard/payouts?refresh=true`,
            return_url: `${origin}/dashboard/payouts?onboarded=true`,
            type: "account_onboarding",
        });

        logger.info("Account link created successfully");
        return NextResponse.json({ url: accountLink.url });
    } catch (error) {
        logger.error({ error }, "Error in Stripe Connect onboarding");

        // Enhanced error logging
        if (error instanceof Stripe.errors.StripeError) {
            logger.error({
                type: error.type,
                code: error.code,
                message: error.message,
                requestId: error.requestId
            }, "Stripe error details");
        }

        return NextResponse.json(
            {
                error: "Failed to create onboarding link",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}