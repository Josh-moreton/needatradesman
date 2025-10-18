import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, messageRateLimit } from "@/lib/redis";
import { pusherServer, getConversationChannel, getUserChannel } from "@/lib/pusher";
import { z } from "zod";
import { Prisma } from "@prisma/client";

import { createLogger } from "@/lib/logger";

const logger = createLogger("messages-api");

// Type for message with includes
type MessageWithRelations = Prisma.MessageGetPayload<{
    include: {
        sender: {
            select: { id: true; firstName: true; lastName: true; email: true };
        };
        receiver: {
            select: { id: true; firstName: true; lastName: true; email: true };
        };
        job: {
            select: { id: true; title: true };
        };
    };
}>;

const sendMessageSchema = z.object({
    content: z.string().min(1, "Message content is required"),
    receiverId: z.string(),
    jobId: z.string().optional(),
    messageType: z.enum(["TEXT", "IMAGE", "FILE"]).default("TEXT"),
});

// Helper: Check rate limit for user
async function checkRateLimit(clerkId: string): Promise<{ allowed: boolean; error?: NextResponse }> {
    if (!messageRateLimit) {
        return { allowed: true };
    }

    try {
        const { success, limit, reset, remaining } = await messageRateLimit.limit(clerkId);

        if (!success) {
            const resetDate = new Date(reset);
            const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

            return {
                allowed: false,
                error: NextResponse.json(
                    { error: `Too many messages. You can only send ${limit} messages per 5 minutes. ${remaining} remaining.` },
                    {
                        status: 429,
                        headers: {
                            'X-RateLimit-Limit': String(limit),
                            'X-RateLimit-Remaining': String(remaining),
                            'X-RateLimit-Reset': String(reset),
                            'Retry-After': String(retryAfter),
                        }
                    }
                )
            };
        }

        return { allowed: true };
    } catch (error) {
        logger.error({ error }, "Rate limiter error (likely Redis connection issue)");
        return { allowed: true }; // Allow request if rate limiting fails
    }
}

// Helper: Verify job authorization
async function verifyJobAuthorization(jobId: string, userId: string): Promise<{ authorized: boolean; error?: NextResponse }> {
    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            applications: {
                where: { tradespersonId: userId },
            },
        },
    });

    if (!job) {
        return {
            authorized: false,
            error: NextResponse.json({ error: "Job not found" }, { status: 404 })
        };
    }

    const isJobOwner = job.customerId === userId;
    const hasApplied = job.applications.length > 0;

    if (!isJobOwner && !hasApplied) {
        return {
            authorized: false,
            error: NextResponse.json(
                { error: "You can only message about jobs you've posted or applied to" },
                { status: 403 }
            )
        };
    }

    return { authorized: true };
}

// Helper: Cache message in Redis
async function cacheMessageInRedis(message: MessageWithRelations, userId: string, receiverId: string, jobId?: string): Promise<void> {
    if (!redis) return;

    try {
        const participantIds = [userId, receiverId].sort((a, b) => a.localeCompare(b)).join(":");
        const channelKey = `chat:${jobId || "general"}:${participantIds}`;
        await redis.lpush(channelKey, JSON.stringify(message));
        await redis.expire(channelKey, 3600); // 1 hour TTL

        // Publish to Redis channel for real-time updates (future WebSocket implementation)
        await redis.publish(`chat:${jobId || "general"}`, JSON.stringify(message));

        // Clear conversation cache
        await redis.del(`conversations:${userId}`);
        await redis.del(`conversations:${receiverId}`);

        logger.debug('Message cached and published successfully');
    } catch (cacheError) {
        logger.error({ error: cacheError }, 'Redis operations error in message creation');
        // Continue - message was saved to database, Redis is optional
    }
}

// Helper: Send Pusher notifications
async function sendPusherNotifications(message: MessageWithRelations, userId: string, receiverId: string, content: string, jobId?: string): Promise<void> {
    if (!jobId) return;

    try {
        // Send to conversation channel (both users see the message)
        const conversationChannel = getConversationChannel(jobId, [userId, receiverId]);
        await pusherServer.trigger(conversationChannel, "new-message", {
            message,
            timestamp: new Date().toISOString(),
        });

        // Send notification to receiver's personal channel
        await pusherServer.trigger(getUserChannel(receiverId), "message-notification", {
            messageId: message.id,
            senderId: userId,
            senderName: message.sender.firstName && message.sender.lastName
                ? `${message.sender.firstName} ${message.sender.lastName}`
                : message.sender.email,
            jobTitle: message.job?.title,
            preview: content.substring(0, 100),
            timestamp: new Date().toISOString(),
        });
    } catch (pusherError) {
        logger.error({ error: pusherError }, "Pusher error");
        // Don't fail the request if Pusher fails
    }
}

// GET /api/messages - Get conversations for current user
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const chatWith = searchParams.get("chatWith");
        const jobId = searchParams.get("jobId");

        if (chatWith && jobId) {
            // Get specific conversation
            const messages = await prisma.message.findMany({
                where: {
                    jobId,
                    OR: [
                        { senderId: user.id, receiverId: chatWith },
                        { senderId: chatWith, receiverId: user.id },
                    ],
                },
                include: {
                    sender: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    receiver: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    job: {
                        select: { id: true, title: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            });

            return NextResponse.json({ messages });
        }

        // Get all conversations
        const conversations = await prisma.message.groupBy({
            by: ["jobId"],
            where: {
                OR: [{ senderId: user.id }, { receiverId: user.id }],
            },
            _max: {
                createdAt: true,
            },
        });

        const conversationDetails = await Promise.all(
            conversations.map(async (conv: { jobId: string | null; _max: { createdAt: Date | null } }) => {
                if (!conv.jobId) return null;

                const lastMessage = await prisma.message.findFirst({
                    where: {
                        jobId: conv.jobId,
                        OR: [{ senderId: user.id }, { receiverId: user.id }],
                    },
                    include: {
                        sender: {
                            select: { id: true, firstName: true, lastName: true, email: true },
                        },
                        receiver: {
                            select: { id: true, firstName: true, lastName: true, email: true },
                        },
                        job: {
                            select: { id: true, title: true, customerId: true },
                        },
                    },
                    orderBy: { createdAt: "desc" },
                });

                if (!lastMessage) return null;

                const otherParticipant =
                    lastMessage.senderId === user.id
                        ? lastMessage.receiver
                        : lastMessage.sender;

                return {
                    jobId: conv.jobId,
                    job: lastMessage.job,
                    otherParticipant,
                    lastMessage: {
                        content: lastMessage.content,
                        createdAt: lastMessage.createdAt,
                        senderId: lastMessage.senderId,
                    },
                };
            })
        );

        const validConversations = conversationDetails.filter(Boolean);

        return NextResponse.json({ conversations: validConversations });
    } catch (error) {
        logger.error({ error }, "Error fetching messages");
        return NextResponse.json(
            { error: "Failed to fetch messages" },
            { status: 500 }
        );
    }
}

// POST /api/messages - Send a new message
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate limiting (use clerkId to avoid reuse of internal IDs)
        const rateLimitResult = await checkRateLimit(user.clerkId);
        if (!rateLimitResult.allowed) {
            return rateLimitResult.error!;
        }

        const body = await request.json();
        const { content, receiverId, jobId, messageType } = sendMessageSchema.parse(body);

        // Verify that the user is either the job poster or has applied to the job
        if (jobId) {
            const authResult = await verifyJobAuthorization(jobId, user.id);
            if (!authResult.authorized) {
                return authResult.error!;
            }
        }

        // Create the message
        const message = await prisma.message.create({
            data: {
                content,
                senderId: user.id,
                receiverId,
                jobId,
                messageType,
            },
            include: {
                sender: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                receiver: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                job: {
                    select: { id: true, title: true },
                },
            },
        });

        // Store in Redis for real-time updates (if Redis is configured)
        await cacheMessageInRedis(message, user.id, receiverId, jobId);

        // Trigger Pusher events for real-time messaging
        await sendPusherNotifications(message, user.id, receiverId, content, jobId);

        return NextResponse.json({ message });
    } catch (error) {
        logger.error({ error }, "Error sending message");
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid input", details: error.errors },
                { status: 400 }
            );
        }
        return NextResponse.json(
            { error: "Failed to send message" },
            { status: 500 }
        );
    }
}
