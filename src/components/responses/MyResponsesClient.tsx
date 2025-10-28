"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, FileText } from "lucide-react";
import { Decimal } from "@prisma/client/runtime/library";

// Types for application with job and customer
interface ApplicationWithJob {
  id: string;
  message: string;
  quote: Decimal | null;
  status: string;
  job: {
    id: string;
    title: string;
    location: string | null;
    budget: Decimal | null;
    status: string;
    customer?: {
      firstName: string | null;
      lastName: string | null;
      id: string;
    } | null;
  };
}

interface MyResponsesClientProps {
  readonly applications: ApplicationWithJob[];
}

export function MyResponsesClient({ applications }: MyResponsesClientProps) {
  const [chatLoading, setChatLoading] = useState<string | null>(null);
  const router = useRouter();

  // Helper to ensure a conversation exists, creating it if needed
  const ensureConversationAndNavigate = async (
    jobId: string,
    participantId: string
  ) => {
    setChatLoading(participantId);
    try {
      const res = await fetch(`/api/messages`);
      const data = await res.json();
      const exists = (data.conversations || []).some(
        (c: { jobId: string; otherParticipant: { id: string } }) =>
          c.jobId === jobId && c.otherParticipant.id === participantId
      );
      if (!exists) {
        await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: "Hi, let's chat about this job!",
            receiverId: participantId,
            jobId,
          }),
        });
      }
      router.push(
        `/dashboard/messages?jobId=${jobId}&with=${participantId}`
      );
    } catch {
      alert("Failed to start chat. Please try again.");
    } finally {
      setChatLoading(null);
    }
  };

  const getStatusColor = (
    status: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PENDING":
        return "secondary";
      case "ACCEPTED":
        return "default";
      case "REJECTED":
        return "destructive";
      case "WITHDRAWN":
        return "outline";
      default:
        return "secondary";
    }
  };

  const formatBudget = (budget: Decimal | number | null | undefined) => {
    if (!budget) return "Budget not specified";
    return `£${Number(budget).toFixed(0)}`;
  };

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No responses yet</CardTitle>
          <CardDescription>
            When you apply to jobs, your responses will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/dashboard/jobs">Browse Jobs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {applications.map((app) => (
        <Card key={app.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">
                  <Link href={`/dashboard/jobs/${app.job.id}`}>
                    {app.job.title}
                  </Link>
                </CardTitle>
                <CardDescription>
                  {app.job.location || "Location not specified"} •{" "}
                  {formatBudget(app.job.budget)}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(app.status)}>{app.status}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Your message:</span>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {app.message}
                </p>
              </div>
              {app.quote && (
                <div>
                  <span className="font-medium">Your quote:</span> £
                  {Number(app.quote).toFixed(2)}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/dashboard/jobs/${app.job.id}`}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Job
                  </Link>
                </Button>
                {app.job.customer?.id && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      ensureConversationAndNavigate(
                        app.job.id,
                        app.job.customer!.id
                      )
                    }
                    disabled={chatLoading === app.job.customer.id}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {chatLoading === app.job.customer.id
                      ? "Starting..."
                      : "Message Customer"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
