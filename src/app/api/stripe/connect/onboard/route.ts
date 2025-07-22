import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma"; // adjust import as needed
import { auth } from "@clerk/nextjs/server"; // or your auth system

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-05-28.basil", // latest
});

export async function POST(request: NextRequest) {
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
        const account = await stripe.accounts.create({
            type: "express",
            email: user.email,
        });
        stripeAccountId = account.id;
        // Save to DB
        await prisma.user.update({
            where: { clerkId: userId },
            data: { stripeAccountId },
        });
    }

    // Create onboarding link
    const origin = request.headers.get("origin") || "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${origin}/tradesperson/dashboard/payouts?refresh=true`,
        return_url: `${origin}/tradesperson/dashboard/payouts?onboarded=true`,
        type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
}