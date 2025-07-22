"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepositPaymentModal } from "@/components/payments/DepositPaymentModal";

interface JobAcceptanceProps {
  jobId: string;
  tradespersonId: string;
  jobTitle: string;
  quote: number;
}

export function JobAcceptance({
  jobId,
  tradespersonId,
  jobTitle,
  quote,
}: JobAcceptanceProps) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  // Calculate deposit as 50% of the quote
  const depositAmount = quote * 0.5;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept Job Proposal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Job Details</h3>
            <p className="text-sm mb-2">{jobTitle}</p>
            <div className="flex justify-between text-sm">
              <span>Quote:</span>
              <span className="font-medium">£{quote.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Deposit (50%):</span>
              <span className="font-medium">£{depositAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>By accepting this quote, you agree to:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Pay a 50% deposit to secure your booking</li>
              <li>Funds will be held securely until job completion</li>
              <li>The remaining 50% will be due after job completion</li>
            </ul>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              className="w-full sm:w-auto"
              onClick={() => setPaymentModalOpen(true)}
            >
              Accept & Pay Deposit
            </Button>
          </div>
        </div>

        <DepositPaymentModal
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          jobId={jobId}
          tradespersonId={tradespersonId}
          jobTitle={jobTitle}
          depositAmount={depositAmount}
        />
      </CardContent>
    </Card>
  );
}
