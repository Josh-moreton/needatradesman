import Pusher from "pusher";
import PusherClient from "pusher-js";

// Server-side Pusher instance
export const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.PUSHER_CLUSTER!,
    useTLS: true,
});

// Client-side Pusher instance
export const pusherClient = new PusherClient(
    process.env.NEXT_PUBLIC_PUSHER_KEY!,
    {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        forceTLS: true,
    }
);

// Helper function to get channel name for a conversation
export function getConversationChannel(jobId: string, participantIds: string[]): string {
    const sortedIds = participantIds.sort();
    return `conversation-${jobId}-${sortedIds.join("-")}`;
}

// Helper function to get user-specific channel for notifications
export function getUserChannel(userId: string): string {
    return `user-${userId}`;
}
