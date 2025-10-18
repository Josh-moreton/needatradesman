import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createTicketMessageSchema } from "@/lib/schemas";
import { createLogger } from "@/lib/logger";
import { ticketMessageRateLimit } from "@/lib/redis";

const logger = createLogger("support-ticket-messages-api");

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

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Check if ticket exists and user has access
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            return new NextResponse("Ticket not found", { status: 404 });
        }

        if (ticket.createdById !== user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Rate limiting for ticket messages
        if (ticketMessageRateLimit) {
            try {
                const rateLimitKey = `${user.clerkId}:${ticketId}`;
                const { success, limit, reset, remaining } = await ticketMessageRateLimit.limit(rateLimitKey);

                if (!success) {
                    const resetDate = new Date(reset);
                    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

                    return new NextResponse(
                        `Rate limit exceeded. Please wait before sending another message.`,
                        {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit': String(limit),
                                'X-RateLimit-Remaining': String(remaining),
                                'X-RateLimit-Reset': String(reset),
                                'Retry-After': String(retryAfter),
                            }
                        }
                    );
                }
            } catch (error) {
                logger.error({ error }, 'Rate limiter error');
            }
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = createTicketMessageSchema.parse(body);

        // Create message
        const message = await prisma.ticketMessage.create({
            data: {
                ticketId,
                authorId: user.id,
                authorRole: "user",
                body: validatedData.body,
            },
            include: {
                attachments: true,
            },
        });

        logger.info({ messageId: message.id, ticketId, userId: user.id }, 'Ticket message created');

        return NextResponse.json(message, { status: 201 });
    } catch (error) {
        logger.error({ error }, 'Error creating ticket message');

        if (error instanceof Error && error.name === "ZodError") {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        return new NextResponse("Internal server error", { status: 500 });
    }
}
