"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createLogger } from '@/lib/logger';

const logger = createLogger('job-completion-card');

interface JobCompletionCardProps {
  jobId: string;
  userRole: "CUSTOMER" | "TRADESPERSON";
  customerConfirmed: boolean;
  tradespersonConfirmed: boolean;
  customerCompletedAt?: string | null;
  tradespersonCompletedAt?: string | null;
  jobStatus: string;
  payoutReleased?: boolean;
  onStatusUpdate?: () => void;
}

export function JobCompletionCard({
  jobId,
  userRole,
  customerConfirmed,
  tradespersonConfirmed,
  customerCompletedAt,
  tradespersonCompletedAt,
  jobStatus,
  payoutReleased = false,
  onStatusUpdate,
}: JobCompletionCardProps) {
  const [loading, setLoading] = useState(false);

  const userHasConfirmed = userRole === "CUSTOMER" ? customerConfirmed : tradespersonConfirmed;
  const otherPartyConfirmed = userRole === "CUSTOMER" ? tradespersonConfirmed : customerConfirmed;
  const bothConfirmed = customerConfirmed && tradespersonConfirmed;

  const handleConfirmCompletion = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        if (data.bothConfirmed) {
          toast.success("Job completed! Payment processing initiated.");
        }
        onStatusUpdate?.();
      } else {
        toast.error(data.error || "Failed to confirm completion");
      }
    } catch (error) {
      logger.error({ error }, "Error confirming completion");
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (jobStatus !== "IN_PROGRESS" && jobStatus !== "COMPLETED") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {bothConfirmed ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Clock className="h-5 w-5 text-amber-600" />
          )}
          Job Completion
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Completion Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Customer</span>
                {customerConfirmed ? (
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
              {customerCompletedAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(customerCompletedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Tradesperson</span>
                {tradespersonConfirmed ? (
                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>
              {tradespersonCompletedAt && (
                <p className="text-xs text-muted-foreground">
                  {new Date(tradespersonCompletedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {bothConfirmed ? (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-green-800">Job Completed!</p>
                <p className="text-green-700">
                  Both parties have confirmed completion.{" "}
                  {payoutReleased
                    ? "Payment has been released to the tradesperson."
                    : "Payment processing is in progress."}
                </p>
              </div>
            </div>
          ) : userHasConfirmed ? (
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800">You&apos;ve confirmed completion</p>
                <p className="text-blue-700">
                  Waiting for the {userRole === "CUSTOMER" ? "tradesperson" : "customer"} to confirm.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Confirm job completion</p>
                <p className="text-amber-700">
                  Please confirm that the work has been completed to your satisfaction.
                  {otherPartyConfirmed && (
                    <span className="block mt-1 font-medium">
                      The {userRole === "CUSTOMER" ? "tradesperson" : "customer"} has already confirmed.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!userHasConfirmed && jobStatus === "IN_PROGRESS" && (
            <Button 
              onClick={handleConfirmCompletion} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Confirming..." : "Confirm Job Completion"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}