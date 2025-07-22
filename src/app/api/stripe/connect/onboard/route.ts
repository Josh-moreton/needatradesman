import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma"; // adjust import as needed
import { auth } from "@clerk/nextjs/server"; // or your auth system

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-05-28.basil", // latest
});

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
            console.log("Creating new Stripe Connect account for user:", user.email);
            const account = await stripe.accounts.create({
                type: "express",
                email: user.email,
                capabilities: {
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
            console.log("Created Stripe account:", stripeAccountId);

            // Save to DB
            await prisma.user.update({
                where: { clerkId: userId },
                data: { stripeAccountId },
            });
        }

        // Create onboarding link
        const origin = request.headers.get("origin") || "http://localhost:3000";
        console.log("Creating account link for:", stripeAccountId);

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${origin}/tradesperson/dashboard/payouts?refresh=true`,
            return_url: `${origin}/tradesperson/dashboard/payouts?onboarded=true`,
            type: "account_onboarding",
        });

        console.log("Account link created successfully");
        return NextResponse.json({ url: accountLink.url });
    } catch (error) {
        console.error("Error in Stripe Connect onboarding:", error);

        // Enhanced error logging
        if (error instanceof Stripe.errors.StripeError) {
            console.error("Stripe error details:", {
                type: error.type,
                code: error.code,
                message: error.message,
                requestId: error.requestId
            });
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