"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DepositPaymentModal } from "@/components/payments/DepositPaymentModal";
import { PriceBreakdownModal } from "@/components/pricing/PriceBreakdownModal";
import { calculateCustomerFee } from '@/lib/stripe';
import { calculateDepositAmount } from '@/lib/utils';

interface JobAcceptanceProps {
  jobId: string;
  tradespersonId: string;
  jobTitle: string;
  quote: number;
  depositPercentage?: number;
}

export function JobAcceptance({
  jobId,
  tradespersonId,
  jobTitle,
  quote,
  depositPercentage = 50,
}: JobAcceptanceProps) {
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [breakdownModalOpen, setBreakdownModalOpen] = useState(false);

  // Calculate deposit based on the configured percentage
  const depositAmount = calculateDepositAmount(quote, depositPercentage);
  
  // Calculate customer platform fee using centralized function
  const depositCustomerFeeInPence = calculateCustomerFee(depositAmount);
  const depositCustomerFee = depositCustomerFeeInPence / 100; // Convert pence to pounds for display
  const depositTotal = depositAmount + depositCustomerFee;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Accept Job Proposal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Airbnb-style: Show total prominently */}
          <div className="bg-primary/5 p-6 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Total to pay now</p>
            <p className="text-4xl font-bold text-primary mb-2">
              £{depositTotal.toFixed(2)}
            </p>
            <button
              onClick={() => setBreakdownModalOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            >
              View price breakdown
            </button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">What happens next:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Pay {depositPercentage}% deposit to secure your booking</li>
              <li>Funds are held securely until job completion</li>
              <li>Pay the remaining {100 - depositPercentage}% after work is complete</li>
              <li>Both payments include the service fee</li>
            </ul>
          </div>

          <div className="flex justify-end mt-6">
            <Button
              className="w-full sm:w-auto"
              size="lg"
              onClick={() => setPaymentModalOpen(true)}
            >
              Accept & Pay £{depositTotal.toFixed(2)}
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

        <PriceBreakdownModal
          isOpen={breakdownModalOpen}
          onClose={() => setBreakdownModalOpen(false)}
          quoteAmount={depositAmount}
          customerFee={depositCustomerFee}
          total={depositTotal}
          title="Deposit Payment Breakdown"
        />
      </CardContent>
    </Card>
  );
}
