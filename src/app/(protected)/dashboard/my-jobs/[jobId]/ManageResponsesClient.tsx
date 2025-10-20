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
import { createLogger } from '@/lib/logger';
import { calculateCustomerFee } from '@/lib/stripe';

const logger = createLogger('manage-responses-client');

interface Job {
  id: string;
  title: string;
  status: string;
  depositPaid: boolean;
  finalPaid: boolean;
  budget: Decimal | null;
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
  quote: Decimal | null;
  depositPercentage: number;
  jobTitle: string;
  onPaymentComplete: () => void;
}

function PayDepositButton({
  jobId,
  tradespersonId,
  quote,
  depositPercentage,
  jobTitle,
  onPaymentComplete,
}: PayDepositButtonProps) {
  const [showDepositModal, setShowDepositModal] = useState(false);

  const depositAmount = quote ? (Number(quote) * depositPercentage) / 100 : 0;
  
  // Calculate customer platform fee using centralized function
  const customerFeeInPence = calculateCustomerFee(depositAmount);
  const customerFee = customerFeeInPence / 100; // Convert pence to pounds for display
  const totalDue = depositAmount + customerFee;

  const handleClose = () => {
    setShowDepositModal(false);
    // Call the callback when modal closes (payment may have completed)
    onPaymentComplete();
  };

  return (
    <>
      <Button
        size="sm"
        variant="default"
        onClick={() => setShowDepositModal(true)}
      >
        💳 Pay Deposit (£{totalDue.toFixed(2)})
      </Button>

      <DepositPaymentModal
        isOpen={showDepositModal}
        onClose={handleClose}
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
  const [applicationData, setApplicationData] = useState<{
    id: string;
    requiresDeposit: boolean;
    depositPercentage: number;
    quote: Decimal | null;
    tradesperson: { id: string };
    job: { id: string; title: string };
  } | null>(null);
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
      logger.error({ error }, "Error fetching application");
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
      logger.error({ error }, "Error updating response");
      alert("Failed to update response. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Calculate the deposit amount if we have application data
  const depositAmount = applicationData?.quote
    ? (applicationData.depositPercentage * Number(applicationData.quote)) / 100
    : 0;

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
          jobId={applicationData.job.id}
          tradespersonId={applicationData.tradesperson.id}
          jobTitle={applicationData.job.title || "Job"}
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

  // Find the accepted application to check deposit requirements
  const acceptedApplication = job.applications.find(app => app.status === "ACCEPTED");
  
  // Helper to determine if payment flow should be shown
  const canShowPaymentFlow = (): boolean => {
    if (!acceptedApplication || job.finalPaid) return false;
    
    // Show payment flow if deposit required and paid, or no deposit required and job accepted
    return (acceptedApplication.requiresDeposit && job.depositPaid) || 
           (!acceptedApplication.requiresDeposit && job.status !== "OPEN");
  };
  
  const shouldShowPaymentFlow = canShowPaymentFlow();

  // Debug: Log job details
  console.log("Job details:", {
    id: job.id,
    status: job.status,
    depositPaid: job.depositPaid,
    finalPaid: job.finalPaid,
    acceptedApplication: acceptedApplication ? {
      requiresDeposit: acceptedApplication.requiresDeposit,
      depositPercentage: acceptedApplication.depositPercentage
    } : null,
    shouldShowPaymentFlow
  });

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

  // Handle completing job and initiating final payment
  const handleCompleteJob = async () => {
    if (!confirm("Are you sure the work is complete and satisfactory? This will allow you to pay the final balance.")) {
      return;
    }

    try {
      // Mark job as complete
      const response = await fetch("/api/jobs/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to complete job");
        return;
      }

      // Refresh to show updated status
      router.refresh();
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      logger.error({ error }, "Failed to complete job");
      alert("Failed to complete job. Please try again.");
    }
  };

  // Handle final payment
  const handleFinalPayment = async () => {
    try {
      const response = await fetch("/api/stripe/final-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to initiate payment");
        return;
      }

      const { url } = await response.json();
      if (url) {
        globalThis.location.href = url;
      }
    } catch (error) {
      logger.error({ error }, "Failed to initiate final payment");
      alert("Failed to initiate payment. Please try again.");
    }
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
      // Navigate to messages page - UPDATED PATH
      router.push(`/dashboard/messages?jobId=${jobId}&with=${participantId}`);
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
          <Link href="/dashboard/my-jobs">
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

      {/* Job Actions */}
      {shouldShowPaymentFlow && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  {acceptedApplication?.requiresDeposit 
                    ? "Complete Job & Pay Final Balance" 
                    : "Complete Job & Make Payment"}
                </h3>
                {job.status === "IN_PROGRESS" && (
                  <p className="text-muted-foreground mb-4">
                    {acceptedApplication?.requiresDeposit
                      ? "Once the work is complete and satisfactory, mark the job as complete and pay the remaining balance to the tradesperson."
                      : "Once the work is complete and satisfactory, mark the job as complete and pay the full amount to the tradesperson."}
                  </p>
                )}
                {job.status === "COMPLETED" && (
                  <p className="text-muted-foreground mb-4">
                    {acceptedApplication?.requiresDeposit
                      ? "Job is marked as complete. Process the final payment to release the remaining balance to the tradesperson."
                      : "Job is marked as complete. Process the payment to release the full amount to the tradesperson."}
                  </p>
                )}
                <div className="flex gap-2">
                  {job.status === "IN_PROGRESS" && (
                    <Button onClick={handleCompleteJob}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Job Complete
                    </Button>
                  )}
                  {job.status === "COMPLETED" && (
                    <Button onClick={handleFinalPayment}>
                      💳 {acceptedApplication?.requiresDeposit ? "Pay Final Balance" : "Pay Full Amount"}
                    </Button>
                  )}
                </div>
              </div>
              <Badge variant="outline" className="text-primary">
                Status: {job.status.replace("_", " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

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
                    {application.requiresDeposit && application.quote && (
                      <Badge variant="secondary" className="text-xs">
                        {application.depositPercentage}% deposit
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

                  {application.quote && (
                    <div className="bg-muted/50 rounded-md p-3">
                      <h4 className="font-medium text-sm mb-2">Payment Details</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Total Quote:</span>
                          <span className="font-medium">{formatBudget(application.quote)}</span>
                        </div>
                        {application.requiresDeposit && (
                          <>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Deposit ({application.depositPercentage}%):</span>
                              <span>£{((Number(application.quote) * application.depositPercentage) / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span>Final Payment ({100 - application.depositPercentage}%):</span>
                              <span>£{((Number(application.quote) * (100 - application.depositPercentage)) / 100).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {!application.requiresDeposit && (
                          <div className="text-muted-foreground text-xs">
                            No deposit required - full payment after job completion
                          </div>
                        )}
                      </div>
                    </div>
                  )}

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
