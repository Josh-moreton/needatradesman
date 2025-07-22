"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type StatusType = "not_setup" | "pending" | "verified";

export function PayoutSetupCard({ status }: { status: StatusType }) {
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to Stripe onboarding
        window.location.href = data.url;
      } else {
        alert("Failed to start onboarding. Please try again.");
      }
    } catch (error) {
      console.error("Error starting onboarding:", error);
      alert("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payout Setup</CardTitle>
          <StatusBadge status={status} />
        </div>
        <CardDescription>
          Set up your bank details to receive payments from completed jobs.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {status === "not_setup" &&
            "You need to set up your payout details to receive payments."}
          {status === "pending" &&
            "Your account is being verified. This may take 1-2 business days."}
          {status === "verified" &&
            "Your payout details are verified. You will receive payments directly to your bank account."}
        </p>
      </CardContent>

      <CardFooter className="flex justify-end">
        {status === "not_setup" && (
          <Button onClick={handleSetup} disabled={loading}>
            {loading ? "Setting up..." : "Set Up Payouts"}
          </Button>
        )}

        {status === "pending" && (
          <Button onClick={handleSetup} variant="outline">
            Continue Setup
          </Button>
        )}

        {status === "verified" && (
          <Button onClick={handleSetup} variant="outline">
            Update Details
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function StatusBadge({ status }: { status: StatusType }) {
  if (status === "not_setup") {
    return <Badge variant="outline">Not Set Up</Badge>;
  }

  if (status === "pending") {
    return <Badge variant="secondary">Verification Pending</Badge>;
  }

  return <Badge variant="default">Verified</Badge>;
}
