import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createTerminalLocation } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-terminal-location");

/**
 * Create a Terminal location for tradesperson
 * Required before registering card readers
 */
export async function POST(request: NextRequest) {
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

        // Only tradespeople can have Terminal locations
        if (user.role !== "TRADESPERSON") {
            return NextResponse.json(
                { error: "Only tradespeople can set up card readers" },
                { status: 403 }
            );
        }

        // Check if user has Stripe Connect account
        if (!user.stripeAccountId) {
            return NextResponse.json(
                { error: "Please complete Stripe Connect onboarding first" },
                { status: 400 }
            );
        }

        // Check if location already exists
        if (user.stripeTerminalLocationId) {
            return NextResponse.json(
                {
                    error: "Terminal location already exists",
                    locationId: user.stripeTerminalLocationId,
                },
                { status: 400 }
            );
        }

        // Parse request body
        const { displayName, address } = await request.json();

        if (!displayName || !address || !address.line1 || !address.city || !address.postalCode) {
            return NextResponse.json(
                { error: "Missing required fields: displayName, address (line1, city, postalCode)" },
                { status: 400 }
            );
        }

        // Create Terminal location
        logger.info(
            { userId: user.id, stripeAccountId: user.stripeAccountId },
            "Creating Terminal location"
        );

        const location = await createTerminalLocation({
            accountId: user.stripeAccountId,
            displayName,
            address: {
                line1: address.line1,
                city: address.city,
                postalCode: address.postalCode,
                country: address.country || "GB",
            },
        });

        // Save location ID to database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                stripeTerminalLocationId: location.id,
            },
        });

        logger.info(
            { userId: user.id, locationId: location.id },
            "Terminal location created successfully"
        );

        return NextResponse.json({
            success: true,
            locationId: location.id,
            displayName: location.display_name,
        });
    } catch (error) {
        logger.error({ error }, "Error creating Terminal location");
        return NextResponse.json(
            {
                error: "Failed to create Terminal location",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

/**
 * Get Terminal location status
 */
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user from DB
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: {
                stripeTerminalLocationId: true,
                terminalReaderId: true,
                terminalReaderLabel: true,
                role: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.role !== "TRADESPERSON") {
            return NextResponse.json(
                { error: "Only tradespeople can access Terminal settings" },
                { status: 403 }
            );
        }

        return NextResponse.json({
            hasLocation: !!user.stripeTerminalLocationId,
            locationId: user.stripeTerminalLocationId,
            hasReader: !!user.terminalReaderId,
            readerId: user.terminalReaderId,
            readerLabel: user.terminalReaderLabel,
        });
    } catch (error) {
        logger.error({ error }, "Error fetching Terminal location status");
        return NextResponse.json(
            { error: "Failed to fetch Terminal location status" },
            { status: 500 }
        );
    }
}
