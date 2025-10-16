"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createLogger } from '@/lib/logger';

const logger = createLogger('final-payment-modal');

interface FinalPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  fullAmount: number;
  depositAmount: number;
}

export function FinalPaymentModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  fullAmount,
  depositAmount,
}: FinalPaymentModalProps) {
  const [loading, setLoading] = useState(false);

  const remainingAmount = fullAmount - depositAmount;

  const handlePayment = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/stripe/final-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to initiate payment");
        setLoading(false);
      }
    } catch (error) {
      logger.error({ error }, "Payment error");
      toast.error("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Final Payment
          </DialogTitle>
          <DialogDescription>
            Complete the payment for your job: {jobTitle}
          </DialogDescription>
        </DialogHeader>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Total Quote:</span>
                <span className="font-medium">£{fullAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Deposit Paid:</span>
                <span>-£{depositAmount.toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between text-base font-semibold">
                <span>Remaining Balance:</span>
                <span className="text-primary">£{remainingAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="bg-muted p-3 rounded-md">
            <p className="font-medium mb-1">Payment Details:</p>
            <ul className="space-y-1 text-xs">
              <li>• This is the final payment for your completed job</li>
              <li>• Funds will be transferred to the tradesperson upon payment</li>
              <li>• You&apos;ll receive a confirmation email after payment</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Pay £{remainingAmount.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}