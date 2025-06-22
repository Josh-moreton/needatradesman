import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redis, messageRateLimit, CACHE_KEYS, CACHE_TTL } from "@/lib/redis";
import { z } from "zod";

const sendMessageSchema = z.object({
    content: z.string().min(1, "Message content is required"),
    receiverId: z.string(),
    jobId: z.string().optional(),
    messageType: z.enum(["TEXT", "IMAGE", "FILE"]).default("TEXT"),
});

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
        console.error("Error fetching messages:", error);
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

        // Rate limiting
        if (messageRateLimit) {
            try {
                await messageRateLimit.consume(user.id);
            } catch (rejRes: any) {
                return NextResponse.json(
                    { error: "Too many messages. Please try again later." },
                    { status: 429, headers: { 'Retry-After': String(Math.ceil(rejRes.msBeforeNext / 1000)) } }
                );
            }
        }

        const body = await request.json();
        const { content, receiverId, jobId, messageType } = sendMessageSchema.parse(body);

        // Verify that the user is either the job poster or has applied to the job
        if (jobId) {
            const job = await prisma.job.findUnique({
                where: { id: jobId },
                include: {
                    applications: {
                        where: { tradespersonId: user.id },
                    },
                },
            });

            if (!job) {
                return NextResponse.json({ error: "Job not found" }, { status: 404 });
            }

            const isJobOwner = job.customerId === user.id;
            const hasApplied = job.applications.length > 0;

            if (!isJobOwner && !hasApplied) {
                return NextResponse.json(
                    { error: "You can only message about jobs you've posted or applied to" },
                    { status: 403 }
                );
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
        if (redis) {
            const participantIds = [user.id, receiverId].sort().join(":");
            const channelKey = CACHE_KEYS.CHAT_MESSAGES(jobId || "general", participantIds);
            await redis.lpush(channelKey, JSON.stringify(message));
            await redis.expire(channelKey, CACHE_TTL.MESSAGES);

            // Publish to Redis channel for real-time updates (future WebSocket implementation)
            await redis.publish(`chat:${jobId || "general"}`, JSON.stringify(message));

            // Clear conversation cache
            await redis.del(CACHE_KEYS.USER_CONVERSATIONS(user.id));
            await redis.del(CACHE_KEYS.USER_CONVERSATIONS(receiverId));
        }

        return NextResponse.json({ message });
    } catch (error) {
        console.error("Error sending message:", error);
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
