"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { DepositPaymentModal } from "@/components/payments/DepositPaymentModal";

import { Decimal } from "@prisma/client/runtime/library";

interface Job {
  id: string;
  title: string;
  depositPaid: boolean;
  applications: Array<{
    id: string;
    message: string;
    quote: Decimal | null;
    status: string;
    requiresDeposit: boolean;
    depositPercentage: number;
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

interface PayDepositButtonProps {
  jobId: string;
  tradespersonId: string;
  applicationId: string;
  quote: Decimal | null;
  depositPercentage: number;
  jobTitle: string;
  onPaymentComplete: () => void;
}

function PayDepositButton({
  jobId,
  tradespersonId,
  applicationId,
  quote,
  depositPercentage,
  jobTitle,
  onPaymentComplete,
}: PayDepositButtonProps) {
  const [showDepositModal, setShowDepositModal] = useState(false);

  const depositAmount = quote ? (Number(quote) * depositPercentage) / 100 : 0;

  const handlePaymentComplete = () => {
    setShowDepositModal(false);
    onPaymentComplete();
  };

  return (
    <>
      <Button
        size="sm"
        variant="default"
        onClick={() => setShowDepositModal(true)}
      >
        💳 Pay Deposit (£{depositAmount.toFixed(2)})
      </Button>

      <DepositPaymentModal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        jobId={jobId}
        tradespersonId={tradespersonId}
        jobTitle={jobTitle}
        depositAmount={depositAmount}
      />
    </>
  );
}

function AcceptRejectButtons({
  applicationId,
  onStatusChange,
}: AcceptRejectButtonsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [applicationData, setApplicationData] = useState<any>(null);
  const router = useRouter();

  // Fetch application details when accepting
  const fetchApplicationDetails = async () => {
    try {
      const response = await fetch(`/api/applications/${applicationId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch application details");
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching application:", error);
      return null;
    }
  };

  const updateStatus = async (status: "ACCEPTED" | "REJECTED") => {
    setIsUpdating(true);

    try {
      if (status === "ACCEPTED") {
        // Fetch application details to check if deposit is required
        const appData = await fetchApplicationDetails();
        setApplicationData(appData);

        if (appData?.requiresDeposit) {
          // Show deposit modal if deposit is required
          setShowDepositModal(true);
          setIsUpdating(false);
          return;
        }
      }

      // If rejecting or no deposit required, just update the status
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

  // Calculate the deposit amount if we have application data
  const depositAmount = applicationData?.quote
    ? (applicationData.depositPercentage * Number(applicationData.quote)) / 100
    : 0;

  // Function to handle deposit payment
  const handleDepositPayment = async () => {
    if (!applicationData) return;

    // First update the application status
    await fetch(`/api/applications/${applicationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: "ACCEPTED" }),
    });

    setShowDepositModal(false);
    onStatusChange();
    router.refresh();
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

      {showDepositModal && applicationData && (
        <DepositPaymentModal
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
          jobId={applicationData.jobId}
          tradespersonId={applicationData.tradespersonId}
          jobTitle={applicationData.job?.title || "Job"}
          depositAmount={depositAmount}
        />
      )}
    </>
  );
}

export function ManageResponsesClient({ job }: ManageResponsesClientProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [chatLoading, setChatLoading] = useState<string | null>(null);
  const router = useRouter();

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

  // Helper to ensure a conversation exists, creating it if needed
  const ensureConversationAndNavigate = async (
    jobId: string,
    participantId: string
  ) => {
    setChatLoading(participantId);
    try {
      // 1. Fetch conversations for this job
      const res = await fetch(`/api/messages`);
      const data = await res.json();
      const exists = (data.conversations || []).some(
        (c: { jobId: string; otherParticipant: { id: string } }) =>
          c.jobId === jobId && c.otherParticipant.id === participantId
      );
      if (!exists) {
        // Create conversation by sending a default message
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
      // Navigate to messages page
      router.push(`/customer/messages?jobId=${jobId}&with=${participantId}`);
    } catch {
      alert("Failed to start chat. Please try again.");
    } finally {
      setChatLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Back Navigation */}
      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link href="/customer/jobs/my-jobs">
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
                When tradespeople respond to your job, they&apos;ll appear here.
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
                    <Badge
                      variant={
                        getStatusColor(application.status) as
                          | "default"
                          | "secondary"
                          | "destructive"
                          | "outline"
                      }
                    >
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
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        ensureConversationAndNavigate(
                          job.id,
                          application.tradesperson.id
                        )
                      }
                      disabled={chatLoading === application.tradesperson.id}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {chatLoading === application.tradesperson.id
                        ? "Starting..."
                        : "Start Chat"}
                    </Button>

                    {application.status === "PENDING" && (
                      <AcceptRejectButtons
                        applicationId={application.id}
                        onStatusChange={handleStatusChange}
                      />
                    )}

                    {/* Show Pay Deposit button for accepted applications with unpaid deposits */}
                    {application.status === "ACCEPTED" &&
                      application.requiresDeposit &&
                      !job.depositPaid && (
                        <PayDepositButton
                          jobId={job.id}
                          tradespersonId={application.tradesperson.id}
                          applicationId={application.id}
                          quote={application.quote}
                          depositPercentage={application.depositPercentage}
                          jobTitle={job.title}
                          onPaymentComplete={handleStatusChange}
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
