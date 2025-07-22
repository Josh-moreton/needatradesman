import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-05-28.basil",
});

export async function GET(request: NextRequest) {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user from DB
    const user = await prisma.user.findUnique({ where: { clerkId: userId } });

    if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // If no Stripe account, they need to set up
    if (!user.stripeAccountId) {
        return NextResponse.json({ status: "not_setup" });
    }

    // Retrieve account details from Stripe
    try {
        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        // Check if the account has completed onboarding
        if (
            account.details_submitted &&
            account.payouts_enabled &&
            account.charges_enabled
        ) {
            return NextResponse.json({ status: "verified" });
        } else {
            return NextResponse.json({ status: "pending" });
        }
    } catch (error) {
        console.error("Error retrieving Stripe account:", error);
        return NextResponse.json(
            { error: "Failed to retrieve Stripe account status" },
            { status: 500 }
        );
    }
}
