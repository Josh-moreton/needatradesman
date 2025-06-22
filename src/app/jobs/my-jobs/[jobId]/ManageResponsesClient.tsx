"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MessageSquare, Clock, CheckCircle, X } from "lucide-react";
import Link from "next/link";

import { Decimal } from "@prisma/client/runtime/library";

interface Job {
  id: string;
  title: string;
  applications: Array<{
    id: string;
    message: string;
    quote: Decimal | null;
    status: string;
    createdAt: Date;
    tradesperson: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  }>;
}

interface ManageResponsesClientProps {
  job: Job;
}

interface AcceptRejectButtonsProps {
  applicationId: string;
  onStatusChange: () => void;
}

function AcceptRejectButtons({
  applicationId,
  onStatusChange,
}: AcceptRejectButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const updateStatus = async (status: "ACCEPTED" | "REJECTED") => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update response");
      }

      onStatusChange();
      router.refresh();
    } catch (error) {
      console.error("Error updating response:", error);
      alert("Failed to update response. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="default"
        onClick={() => updateStatus("ACCEPTED")}
        disabled={isUpdating}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        {isUpdating ? "Accepting..." : "Accept"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        onClick={() => updateStatus("REJECTED")}
        disabled={isUpdating}
      >
        <X className="h-4 w-4 mr-2" />
        {isUpdating ? "Rejecting..." : "Reject"}
      </Button>
    </>
  );
}

export function ManageResponsesClient({ job }: ManageResponsesClientProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const getStatusColor = (status: string) => {
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

  const formatBudget = (budget: Decimal | null) => {
    if (!budget) return null;
    return `£${Number(budget).toFixed(0)}`;
  };

  const getTradespersonName = (
    tradesperson: Job["applications"][0]["tradesperson"]
  ) => {
    if (tradesperson.firstName && tradesperson.lastName) {
      return `${tradesperson.firstName} ${tradesperson.lastName}`;
    }
    return tradesperson.email;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const handleStatusChange = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/jobs/my-jobs">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Jobs
          </Link>
        </Button>
      </div>

      {/* Job Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">{job.title}</CardTitle>
          <CardDescription>
            Manage responses for this job posting
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Responses */}
      <div className="space-y-4" key={refreshKey}>
        <h2 className="text-xl font-semibold">
          Responses ({job.applications.length})
        </h2>

        {job.applications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No responses yet</h3>
              <p className="text-muted-foreground">
                When tradespeople respond to your job, they'll appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          job.applications.map((application) => (
            <Card key={application.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">
                      {getTradespersonName(application.tradesperson)}
                    </CardTitle>
                    <CardDescription>
                      Applied {formatDate(application.createdAt)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(application.status) as any}>
                      {application.status}
                    </Badge>
                    {application.quote && (
                      <Badge variant="outline">
                        Quote: {formatBudget(application.quote)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Message</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap">
                      {application.message}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        href={`/messages?jobId=${job.id}&with=${application.tradesperson.id}`}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Start Chat
                      </Link>
                    </Button>

                    {application.status === "PENDING" && (
                      <AcceptRejectButtons
                        applicationId={application.id}
                        onStatusChange={handleStatusChange}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
