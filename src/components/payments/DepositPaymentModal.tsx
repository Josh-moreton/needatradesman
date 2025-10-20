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
import { Loader2 } from "lucide-react";
import { createLogger } from '@/lib/logger';
import { calculateCustomerFee, STRIPE_CONFIG } from '@/lib/stripe';

const logger = createLogger('deposit-payment-modal');

interface DepositPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  tradespersonId: string;
  jobTitle: string;
  depositAmount: number;
}

export function DepositPaymentModal({
  isOpen,
  onClose,
  jobId,
  tradespersonId,
  jobTitle,
  depositAmount,
}: DepositPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate customer platform fee using centralized function
  const customerFeeInPence = calculateCustomerFee(depositAmount);
  const customerFee = customerFeeInPence / 100; // Convert pence to pounds for display
  const totalAmount = depositAmount + customerFee;

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId,
          tradespersonId,
          depositAmount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      logger.error({ error: err }, "Payment error");
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Deposit to Secure Booking</DialogTitle>
          <DialogDescription>
            Pay a deposit to secure your booking for &quot;{jobTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col space-y-4 py-4">
          <div className="rounded-md bg-muted p-4">
            <h4 className="font-medium mb-2">Payment Breakdown</h4>
            <ul className="text-sm space-y-2">
              <li className="flex justify-between">
                <span>Job:</span>
                <span className="font-medium">{jobTitle}</span>
              </li>
              <li className="flex justify-between pt-2 mt-2 border-t">
                <span>Deposit Amount:</span>
                <span className="font-medium">
                  £{depositAmount?.toFixed(2)}
                </span>
              </li>
              <li className="flex justify-between text-muted-foreground">
                <span>Platform Fee ({STRIPE_CONFIG.customerFeePercentage}%):</span>
                <span>£{customerFee?.toFixed(2)}</span>
              </li>
              <li className="flex justify-between font-semibold pt-2 mt-2 border-t">
                <span>Total Due:</span>
                <span className="text-primary">£{totalAmount?.toFixed(2)}</span>
              </li>
              <li className="text-xs text-muted-foreground mt-3">
                The deposit secures your booking and will be held in escrow
                until job completion. The tradesperson receives the deposit minus a 4% platform fee.
              </li>
            </ul>
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handlePayment} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Pay Deposit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
