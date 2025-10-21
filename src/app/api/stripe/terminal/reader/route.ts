import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { registerTerminalReader, getTerminalReaderStatus } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-terminal-reader");

/**
 * Register a card reader to tradesperson's Terminal location
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

        // Only tradespeople can register readers
        if (user.role !== "TRADESPERSON") {
            return NextResponse.json(
                { error: "Only tradespeople can register card readers" },
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

        // Check if user has Terminal location
        if (!user.stripeTerminalLocationId) {
            return NextResponse.json(
                { error: "Please create a Terminal location first" },
                { status: 400 }
            );
        }

        // Parse request body
        const { registrationCode, label } = await request.json();

        if (!registrationCode || !label) {
            return NextResponse.json(
                { error: "Missing required fields: registrationCode, label" },
                { status: 400 }
            );
        }

        // Register the reader
        logger.info(
            { userId: user.id, locationId: user.stripeTerminalLocationId },
            "Registering Terminal reader"
        );

        const reader = await registerTerminalReader({
            accountId: user.stripeAccountId,
            registrationCode,
            label,
            locationId: user.stripeTerminalLocationId,
        });

        // Save reader ID to database
        await prisma.user.update({
            where: { id: user.id },
            data: {
                terminalReaderId: reader.id,
                terminalReaderLabel: label,
            },
        });

        logger.info(
            { userId: user.id, readerId: reader.id },
            "Terminal reader registered successfully"
        );

        return NextResponse.json({
            success: true,
            readerId: reader.id,
            label: reader.label,
            status: reader.status,
        });
    } catch (error) {
        logger.error({ error }, "Error registering Terminal reader");
        return NextResponse.json(
            {
                error: "Failed to register Terminal reader",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

/**
 * Get card reader status
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
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        if (user.role !== "TRADESPERSON") {
            return NextResponse.json(
                { error: "Only tradespeople can access reader status" },
                { status: 403 }
            );
        }

        if (!user.stripeAccountId || !user.terminalReaderId) {
            return NextResponse.json(
                { error: "No card reader registered" },
                { status: 404 }
            );
        }

        // Get reader status from Stripe
        const reader = await getTerminalReaderStatus({
            accountId: user.stripeAccountId,
            readerId: user.terminalReaderId,
        });

        // Type guard to check if reader is deleted
        if ('deleted' in reader && reader.deleted) {
            return NextResponse.json(
                { error: "Reader has been deleted" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            readerId: reader.id,
            label: reader.label,
            status: reader.status,
            deviceType: reader.device_type,
            serialNumber: reader.serial_number,
        });
    } catch (error) {
        logger.error({ error }, "Error fetching reader status");
        return NextResponse.json(
            { error: "Failed to fetch reader status" },
            { status: 500 }
        );
    }
}
