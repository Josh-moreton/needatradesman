import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { stripe } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";
import Stripe from "stripe";

const logger = createLogger("stripe-capital-offers");

/**
 * GET /api/stripe/capital/offers
 * Retrieve Stripe Capital financing information for the authenticated tradesperson
 * 
 * Stripe Capital is offered to eligible Express accounts based on their payment history.
 * The capital_financing_summary field on the Account object provides information about
 * available offers. Tradespeople can access full offer details through the Stripe Dashboard.
 */
export async function GET() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user from DB
        const user = await prisma.user.findUnique({ 
            where: { clerkId: userId } 
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Only tradespeople with Stripe Connect accounts can access Capital
        if (user.role !== "TRADESPERSON") {
            return NextResponse.json({ 
                error: "Only tradespeople can access Capital financing" 
            }, { status: 403 });
        }

        if (!user.stripeAccountId) {
            return NextResponse.json({ 
                error: "Stripe Connect account not set up",
                hasAccount: false,
                eligible: false
            }, { status: 400 });
        }

        // Retrieve the Stripe account with capital_financing_summary
        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        // Check if account is fully onboarded
        if (!account.details_submitted || !account.payouts_enabled || !account.charges_enabled) {
            return NextResponse.json({
                error: "Stripe account not fully onboarded",
                hasAccount: true,
                onboarded: false,
                eligible: false
            }, { status: 400 });
        }

        // Stripe Capital eligibility and offers are determined by Stripe based on:
        // - Payment processing history
        // - Account health
        // - Geographic availability (UK, US, etc.)
        // The capital_financing_summary field contains offer information
        
        // Define minimal shape of the capital summary we expose
        interface CapitalSummary {
            available_amount?: number;
            currency?: string;
            // Other fields exist but we intentionally limit exposure here
        }

        // Access the field safely and narrow the type
        const capitalSummary = (account as unknown as { capital_financing_summary?: CapitalSummary }).capital_financing_summary;
        
        // Build response with available information
        const response: {
            hasAccount: boolean;
            onboarded: boolean;
            eligible: boolean;
            capitalEnabled: boolean;
            dashboardUrl?: string;
            summary?: CapitalSummary;
        } = {
            hasAccount: true,
            onboarded: true,
            eligible: false,
            capitalEnabled: false,
        };

        // Check if Capital is available for this account
        if (capitalSummary) {
            response.eligible = true;
            response.capitalEnabled = true;
            // Only include minimal summary fields in the API response
            response.summary = {
                available_amount: capitalSummary.available_amount,
                currency: capitalSummary.currency,
            };
        }

        // Generate a login link for the tradesperson to access their Stripe Dashboard
        // where they can view full Capital offer details and apply
        const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId);
        response.dashboardUrl = loginLink.url;

        logger.info({ 
            userId: user.id,
            hasCapital: !!capitalSummary,
            accountId: user.stripeAccountId
        }, "Retrieved Capital financing information");

        return NextResponse.json(response);
    } catch (error) {
        logger.error({ error }, "Error retrieving Capital financing information");
        
        if (error instanceof Stripe.errors.StripeError) {
            logger.error({
                type: error.type,
                code: error.code,
                message: error.message,
            }, "Stripe error details");
        }
        
        return NextResponse.json(
            {
                error: "Failed to retrieve financing information",
                details: error instanceof Error ? error.message : "Unknown error"
            },
            { status: 500 }
        );
    }
}
