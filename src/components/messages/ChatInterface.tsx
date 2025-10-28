"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  pusherClient,
  getConversationChannel,
  getUserChannel,
} from "@/lib/pusher";
import {
  ConversationList,
  MessageList,
  MessageInput,
} from "@/components/messages/ChatComponents";
import { createLogger } from '@/lib/logger';

const logger = createLogger('chat-interface');

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  sender: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  receiver: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  job?: {
    id: string;
    title: string;
  };
}

interface Conversation {
  jobId: string;
  job: {
    id: string;
    title: string;
    customerId: string;
  };
  otherParticipant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  lastMessage: {
    content: string;
    createdAt: Date;
    senderId: string;
  };
}

interface ChatInterfaceProps {
  currentUserId: string;
}

export function ChatInterface({ currentUserId }: Readonly<ChatInterfaceProps>) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<{
    jobId: string;
    participantId: string;
  } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Ref to track subscribed channels for cleanup
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const withUserId = searchParams.get("with");

  // Set up Pusher subscription for real-time messages
  useEffect(() => {
    if (selectedConversation) {
      const subscribedChannels = subscribedChannelsRef.current;
      const conversationChannel = getConversationChannel(
        selectedConversation.jobId,
        [currentUserId, selectedConversation.participantId]
      );

      // Subscribe to conversation channel
      const channel = pusherClient.subscribe(conversationChannel);
      subscribedChannels.add(conversationChannel);

      // Listen for new messages
      channel.bind(
        "new-message",
        (data: { message: Message; timestamp: string }) => {
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((msg) => msg.id === data.message.id)) {
              return prev;
            }
            return [
              ...prev,
              { ...data.message, createdAt: new Date(data.message.createdAt) },
            ];
          });

          // Update conversations list to reflect new last message
          setConversations((prev) =>
            prev.map((conv) =>
              conv.jobId === selectedConversation.jobId &&
              conv.otherParticipant.id === selectedConversation.participantId
                ? {
                    ...conv,
                    lastMessage: {
                      content: data.message.content,
                      createdAt: new Date(data.message.createdAt),
                      senderId: data.message.senderId,
                    },
                  }
                : conv
            )
          );
        }
      );

      return () => {
        // Cleanup: unsubscribe from channel
        pusherClient.unsubscribe(conversationChannel);
        subscribedChannels.delete(conversationChannel);
      };
    }
  }, [selectedConversation, currentUserId]);

  // Subscribe to user notifications channel
  useEffect(() => {
    const subscribedChannels = subscribedChannelsRef.current;
    const userChannel = getUserChannel(currentUserId);
    const channel = pusherClient.subscribe(userChannel);
    subscribedChannels.add(userChannel);

    // Listen for message notifications (for conversations not currently open)
    channel.bind(
      "message-notification",
      (data: {
        messageId: string;
        senderId: string;
        senderName: string;
        jobTitle?: string;
        preview: string;
        timestamp: string;
      }) => {
        // Only show notification if the message is not from current conversation
        if (
          !selectedConversation ||
          data.senderId !== selectedConversation.participantId
        ) {
          // Refresh conversations to show updated last message
          fetchConversations();
        }
      }
    );

    return () => {
      pusherClient.unsubscribe(userChannel);
      subscribedChannels.delete(userChannel);
    };
  }, [currentUserId, selectedConversation]);

  // Cleanup all subscriptions on unmount
  useEffect(() => {
    const subscribedChannels = subscribedChannelsRef.current;
    return () => {
      subscribedChannels.forEach((channelName) => {
        pusherClient.unsubscribe(channelName);
      });
      subscribedChannels.clear();
    };
  }, []);

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Auto-select conversation if URL parameters are provided
  useEffect(() => {
    if (jobId && withUserId && conversations.length > 0) {
      const conversation = conversations.find(
        (c) => c.jobId === jobId && c.otherParticipant.id === withUserId
      );
      if (conversation) {
        setSelectedConversation({ jobId, participantId: withUserId });
      }
    }
  }, [jobId, withUserId, conversations]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(
        selectedConversation.jobId,
        selectedConversation.participantId
      );
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/messages");
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      logger.error({ error }, "Error fetching conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (jobId: string, participantId: string) => {
    try {
      const response = await fetch(
        `/api/messages?jobId=${jobId}&chatWith=${participantId}`
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      logger.error({ error }, "Error fetching messages");
    }
  };

  const sendMessage = async (content: string) => {
    if (!selectedConversation) return;

    setSendingMessage(true);
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          receiverId: selectedConversation.participantId,
          jobId: selectedConversation.jobId,
        }),
      });

      if (response.ok) {
        // Do not optimistically add the message; rely on Pusher event for real-time update
        // const data = await response.json();
        // setMessages((prev) => [...prev, data.message]);
        // Refresh conversations to update last message
        fetchConversations();
      }
    } catch (error) {
      logger.error({ error }, "Error sending message");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSelectConversation = (jobId: string, participantId: string) => {
    setSelectedConversation({ jobId, participantId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Loading conversations...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Conversations List */}
      <div className="lg:col-span-1">
        <Card className="h-full overflow-hidden">
          <div className="p-4 h-full overflow-y-auto">
            <ConversationList
              conversations={conversations}
              currentUserId={currentUserId}
              onSelectConversation={handleSelectConversation}
              selectedConversation={selectedConversation}
            />
          </div>
        </Card>
      </div>

      {/* Chat View */}
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="border-b p-4">
                <h3 className="font-semibold">
                  {(() => {
                    const conv = conversations.find(
                      (c) =>
                        c.jobId === selectedConversation.jobId &&
                        c.otherParticipant.id ===
                          selectedConversation.participantId
                    );
                    if (!conv) return "Chat";
                    const name =
                      conv.otherParticipant.firstName &&
                      conv.otherParticipant.lastName
                        ? `${conv.otherParticipant.firstName} ${conv.otherParticipant.lastName}`
                        : conv.otherParticipant.email;
                    return `${name} - ${conv.job.title}`;
                  })()}
                </h3>
              </div>

              {/* Messages */}
              <MessageList messages={messages} currentUserId={currentUserId} />

              {/* Message Input */}
              <MessageInput
                onSendMessage={sendMessage}
                disabled={sendingMessage}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">
                Select a conversation to start messaging
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
