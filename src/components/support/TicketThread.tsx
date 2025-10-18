"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { createLogger } from '@/lib/logger';
import { TicketStatus, TicketPriority } from "@prisma/client";

const logger = createLogger('ticket-thread');

type TicketThreadProps = {
  ticket: {
    id: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: string;
    initialBody: string;
    createdAt: Date;
    createdByEmail: string;
    messages?: Array<{
      id: string;
      body: string;
      authorRole: string;
      createdAt: Date;
    }>;
  };
};

const statusColors = {
  [TicketStatus.OPEN]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [TicketStatus.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  [TicketStatus.RESOLVED]: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  [TicketStatus.CLOSED]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

const priorityColors = {
  [TicketPriority.LOW]: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  [TicketPriority.NORMAL]: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  [TicketPriority.HIGH]: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  [TicketPriority.URGENT]: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export function TicketThread({ ticket }: TicketThreadProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const canReply = ticket.status !== TicketStatus.CLOSED && ticket.status !== TicketStatus.RESOLVED;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: message }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to send message");
      }

      toast.success("Message sent successfully!");
      setMessage("");
      router.refresh();
    } catch (error) {
      logger.error({ error }, "Error sending message");
      
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes("rate limit")) {
          toast.error("Rate limit exceeded. Please wait before sending another message.");
        } else {
          toast.error(error.message || "Failed to send message. Please try again.");
        }
      } else {
        toast.error("Failed to send message. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Ticket Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span>Category: {ticket.category}</span>
                <span>•</span>
                <span>Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Badge className={statusColors[ticket.status]} variant="outline">
                {ticket.status}
              </Badge>
              <Badge className={priorityColors[ticket.priority]} variant="outline">
                {ticket.priority}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-medium">Initial Description</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {ticket.initialBody}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {ticket.messages && ticket.messages.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Messages</h3>
          {ticket.messages.map((msg) => (
            <Card key={msg.id} className={msg.authorRole === "admin" ? "border-l-4 border-l-primary" : ""}>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={msg.authorRole === "admin" ? "default" : "outline"}>
                      {msg.authorRole === "admin" ? "Support Team" : "You"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reply Form */}
      {canReply ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a Message</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                placeholder="Type your message here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              <Button type="submit" disabled={isSubmitting || !message.trim()}>
                {isSubmitting ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              This ticket is {ticket.status.toLowerCase()} and cannot receive new messages.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
