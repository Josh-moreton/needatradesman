import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createTicketSchema, TicketRole } from "@/lib/schemas";
import { createLogger } from "@/lib/logger";
import { ticketCreateRateLimit } from "@/lib/redis";
import { TicketStatus } from "@prisma/client";

const logger = createLogger("support-tickets-api");

export async function POST(request: NextRequest) {
    try {
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

        // Rate limiting for ticket creation
        if (ticketCreateRateLimit) {
            try {
                const { success, limit, reset, remaining } = await ticketCreateRateLimit.limit(user.clerkId);

                if (!success) {
                    const resetDate = new Date(reset);
                    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

                    return new NextResponse(
                        `Rate limit exceeded. You can only create ${limit} tickets per 24 hours. ${remaining} remaining.`,
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
        const validatedData = createTicketSchema.parse(body);

        // Determine role from user
        const role = user.role === "CUSTOMER" ? TicketRole.CUSTOMER : TicketRole.TRADESPERSON;

        // Create ticket in database
        const ticket = await prisma.ticket.create({
            data: {
                createdById: user.id,
                createdByEmail: user.email,
                role,
                category: validatedData.category,
                priority: validatedData.priority,
                subject: validatedData.subject,
                initialBody: validatedData.body,
                status: "OPEN",
            },
        });

        logger.info({ ticketId: ticket.id, userId: user.id }, 'Ticket created');

        return NextResponse.json(ticket, { status: 201 });
    } catch (error) {
        logger.error({ error }, 'Error creating ticket');

        if (error instanceof Error && error.name === "ZodError") {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
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

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get("status");
        const page = Number.parseInt(searchParams.get("page") || "1");
        const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20"), 100);

        // Validate enum value
        const status = statusParam && Object.values(TicketStatus).includes(statusParam as TicketStatus)
            ? statusParam as TicketStatus
            : undefined;

        // Build where clause - users can only see their own tickets
        const where = {
            createdById: user.id,
            ...(status && { status }),
        };

        // Get tickets with pagination
        const [tickets, totalCount] = await Promise.all([
            prisma.ticket.findMany({
                where,
                include: {
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                    _count: {
                        select: {
                            messages: true,
                        },
                    },
                },
                orderBy: {
                    lastUpdatedAt: "desc",
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.ticket.count({ where })
        ]);

        return NextResponse.json({
            tickets,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit),
                hasMore: page * limit < totalCount
            }
        });
    } catch (error) {
        logger.error({ error }, 'Error fetching tickets');
        return new NextResponse("Internal server error", { status: 500 });
    }
}
