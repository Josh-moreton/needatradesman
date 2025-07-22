import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-05-28.basil",
});

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { jobId, depositAmount, tradespersonId } = await request.json();

    if (!jobId || !depositAmount || !tradespersonId) {
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

        // Calculate the deposit amount (use parameter or default to 50%)
        const deposit = depositAmount || Number(fullAmount) * 0.5;

        // Format for Stripe (amount in cents/pennies)
        const formattedDepositAmount = Math.round(deposit * 100);

        // Get origin for success/cancel URLs
        const origin = request.headers.get("origin") || "http://localhost:3000";

        // Create a Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            line_items: [
                {
                    price_data: {
                        currency: "gbp",
                        product_data: {
                            name: `Deposit for ${job.title}`,
                            description: `50% deposit to book this job`,
                        },
                        unit_amount: formattedDepositAmount,
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                jobId: job.id,
                tradespersonId: tradespersonId,
                applicationType: "deposit",
                applicationId: application.id,
            },
            success_url: `${origin}/customer/jobs/${jobId}?payment_success=true`,
            cancel_url: `${origin}/customer/jobs/${jobId}?payment_cancelled=true`,
        });

        // Return the session URL
        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        return NextResponse.json(
            { error: "Failed to create checkout session" },
            { status: 500 }
        );
    }
}
