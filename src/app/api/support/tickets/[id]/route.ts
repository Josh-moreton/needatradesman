import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";

const logger = createLogger("support-ticket-detail-api");

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check authentication
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Get ticket with messages
        const ticket = await prisma.ticket.findUnique({
            where: { id },
            include: {
                messages: {
                    include: {
                        attachments: true,
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!ticket) {
            return new NextResponse("Ticket not found", { status: 404 });
        }

        // Check authorization - users can only see their own tickets
        if (ticket.createdById !== user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        return NextResponse.json(ticket);
    } catch (error) {
        logger.error({ error }, 'Error fetching ticket');
        return new NextResponse("Internal server error", { status: 500 });
    }
}
