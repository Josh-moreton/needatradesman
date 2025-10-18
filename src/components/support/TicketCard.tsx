"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TicketStatus, TicketPriority } from "@prisma/client";
import { formatDistanceToNow } from "date-fns";

type TicketCardProps = {
  ticket: {
    id: string;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    category: string;
    createdAt: Date;
    lastUpdatedAt: Date;
    messages?: Array<{ createdAt: Date }>;
    _count?: {
      messages: number;
    };
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

export function TicketCard({ ticket }: TicketCardProps) {
  const messageCount = ticket._count?.messages || 0;
  const lastMessage = ticket.messages?.[0];

  return (
    <Link href={`/support/tickets/${ticket.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg">{ticket.subject}</CardTitle>
            <div className="flex gap-2 flex-shrink-0">
              <Badge className={statusColors[ticket.status]} variant="outline">
                {ticket.status}
              </Badge>
              <Badge className={priorityColors[ticket.priority]} variant="outline">
                {ticket.priority}
              </Badge>
            </div>
          </div>
          <CardDescription>
            <div className="flex flex-wrap gap-2 text-sm">
              <span>Category: {ticket.category}</span>
              <span>•</span>
              <span>{messageCount} {messageCount === 1 ? 'message' : 'messages'}</span>
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Created {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
            </p>
            {lastMessage && (
              <p>
                Last updated {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: true })}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
