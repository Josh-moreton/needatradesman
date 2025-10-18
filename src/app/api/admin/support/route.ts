import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { TicketStatus, TicketPriority } from "@prisma/client";

const logger = createLogger("admin-support-api");

// Helper to check if user is admin (using Clerk metadata)
async function isAdmin(userId: string): Promise<boolean> {
    // For now, we'll check via environment variable list of admin user IDs
    // In production, this should use Clerk publicMetadata with an admin role
    const adminUserIds = process.env.ADMIN_USER_IDS?.split(',').map(id => id.trim()) || [];
    return adminUserIds.includes(userId);
}

export async function GET(request: NextRequest) {
    try {
        // Check authentication
        const { userId } = await auth();
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Check if user is admin
        if (!await isAdmin(userId)) {
            return new NextResponse("Forbidden - Admin access required", { status: 403 });
        }

        // Get query parameters
        const { searchParams } = new URL(request.url);
        const statusParam = searchParams.get("status");
        const category = searchParams.get("category");
        const priorityParam = searchParams.get("priority");
        const assigneeId = searchParams.get("assigneeId");
        const page = Number.parseInt(searchParams.get("page") || "1");
        const limit = Math.min(Number.parseInt(searchParams.get("limit") || "20"), 100);

        // Validate enum values
        const status = statusParam && Object.values(TicketStatus).includes(statusParam as TicketStatus) 
            ? statusParam as TicketStatus 
            : undefined;
        const priority = priorityParam && Object.values(TicketPriority).includes(priorityParam as TicketPriority)
            ? priorityParam as TicketPriority
            : undefined;

        // Build where clause - admins can see all tickets
        const where = {
            ...(status && { status }),
            ...(category && { category }),
            ...(priority && { priority }),
            ...(assigneeId && { assigneeId }),
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
        logger.error({ error }, 'Error fetching admin tickets');
        return new NextResponse("Internal server error", { status: 500 });
    }
}
