import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

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

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  onSelectConversation: (jobId: string, participantId: string) => void;
  selectedConversation?: { jobId: string; participantId: string } | null;
}

export function ConversationList({
  conversations,
  currentUserId,
  onSelectConversation,
  selectedConversation,
}: Readonly<ConversationListProps>) {
  const getParticipantName = (
    participant: Conversation["otherParticipant"]
  ) => {
    if (participant.firstName && participant.lastName) {
      return `${participant.firstName} ${participant.lastName}`;
    }
    return participant.email;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">Conversations</h3>
      {conversations.length === 0 ? (
        <p className="text-muted-foreground text-sm">No conversations yet</p>
      ) : (
        conversations.map((conversation) => (
          <Card
            key={`${conversation.jobId}-${conversation.otherParticipant.id}`}
            className={`p-4 cursor-pointer transition-colors hover:bg-accent ${
              selectedConversation?.jobId === conversation.jobId &&
              selectedConversation?.participantId ===
                conversation.otherParticipant.id
                ? "bg-accent"
                : ""
            }`}
            onClick={() =>
              onSelectConversation(
                conversation.jobId,
                conversation.otherParticipant.id
              )
            }
          >
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between items-start">
                <h4 className="font-medium text-sm">
                  {getParticipantName(conversation.otherParticipant)}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(
                    new Date(conversation.lastMessage.createdAt),
                    {
                      addSuffix: true,
                    }
                  )}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Job: {conversation.job.title}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {conversation.lastMessage.senderId === currentUserId
                  ? "You: "
                  : ""}
                {conversation.lastMessage.content}
              </p>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
}

export function MessageList({ messages, currentUserId }: Readonly<MessageListProps>) {
  return (
    <div className="flex-1 overflow-y-auto space-y-4 p-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${
            message.senderId === currentUserId ? "justify-end" : "justify-start"
          }`}
        >
          <div
            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.senderId === currentUserId
                ? "bg-primary text-primary-foreground"
                : "bg-muted"
            }`}
          >
            <p className="text-sm">{message.content}</p>
            <p
              className={`text-xs mt-1 ${
                message.senderId === currentUserId
                  ? "text-primary-foreground/70"
                  : "text-muted-foreground"
              }`}
            >
              {formatDistanceToNow(new Date(message.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface MessageInputProps {
  onSendMessage: (content: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, disabled }: Readonly<MessageInputProps>) {
  const [message, setMessage] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t p-4">
      <div className="flex space-x-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
        />
        <Button type="submit" disabled={!message.trim() || disabled}>
          Send
        </Button>
      </div>
    </form>
  );
}
