import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createTerminalConnectionToken } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-terminal-connection-token");

/**
 * Create a connection token for Terminal reader
 * This is called by the Terminal SDK to establish connection with Stripe
 */
export async function POST() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user from DB
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Only tradespeople can get connection tokens
        if (user.role !== "TRADESPERSON") {
            return NextResponse.json(
                { error: "Only tradespeople can access Terminal" },
                { status: 403 }
            );
        }

        // Check if user has Stripe Connect account
        if (!user.stripeAccountId) {
            return NextResponse.json(
                { error: "Stripe Connect account not set up" },
                { status: 400 }
            );
        }

        // Create connection token
        logger.debug(
            { userId: user.id, stripeAccountId: user.stripeAccountId },
            "Creating Terminal connection token"
        );

        const connectionToken = await createTerminalConnectionToken(user.stripeAccountId);

        return NextResponse.json({
            secret: connectionToken.secret,
        });
    } catch (error) {
        logger.error({ error }, "Error creating connection token");
        return NextResponse.json(
            {
                error: "Failed to create connection token",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
