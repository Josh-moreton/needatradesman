import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { updateTicketSchema, createTicketMessageSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/logger";

const logger = createLogger("admin-support-detail-api");

// Helper to check if user is admin (using Clerk metadata)
async function isAdmin(userId: string): Promise<boolean> {
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    return adminUserIds.includes(userId);
}

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

        // Check if user is admin
        if (!await isAdmin(userId)) {
            return new NextResponse("Forbidden - Admin access required", { status: 403 });
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

        return NextResponse.json(ticket);
    } catch (error) {
        logger.error({ error }, 'Error fetching admin ticket');
        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function PATCH(
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

        // Check if user is admin
        if (!await isAdmin(userId)) {
            return new NextResponse("Forbidden - Admin access required", { status: 403 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = updateTicketSchema.parse(body);

        // Check if ticket exists
        const ticket = await prisma.ticket.findUnique({
            where: { id },
        });

        if (!ticket) {
            return new NextResponse("Ticket not found", { status: 404 });
        }

        // Update ticket
        const updatedTicket = await prisma.ticket.update({
            where: { id },
            data: validatedData,
        });

        logger.info({ ticketId: id, adminId: user.id }, 'Ticket updated by admin');

        return NextResponse.json(updatedTicket);
    } catch (error) {
        logger.error({ error }, 'Error updating ticket');

        if (error instanceof Error && error.name === "ZodError") {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: ticketId } = await params;

        // Check authentication
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user is admin
        if (!await isAdmin(userId)) {
            return new NextResponse("Forbidden - Admin access required", { status: 403 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Check if ticket exists
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            return new NextResponse("Ticket not found", { status: 404 });
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = createTicketMessageSchema.parse(body);

        // Create admin message (no rate limit for admin responses)
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId,
                authorId: user.id,
                authorRole: "admin",
                body: validatedData.body,
            },
            include: {
                attachments: true,
            },
        });

        logger.info({ messageId: message.id, ticketId, adminId: user.id }, 'Admin message created');

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        logger.error({ error }, 'Error creating admin message');

        if (error instanceof Error && error.name === "ZodError") {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        return new NextResponse("Internal server error", { status: 500 });
    }
}
