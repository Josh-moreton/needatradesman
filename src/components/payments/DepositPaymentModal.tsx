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
import { calculateCustomerFee } from '@/lib/stripe';
import { PriceBreakdownModal } from "@/components/pricing/PriceBreakdownModal";

const logger = createLogger('deposit-payment-modal');

interface DepositPaymentModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly jobId: string;
  readonly tradespersonId: string;
  readonly jobTitle: string;
  readonly depositAmount: number;
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
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  
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
        globalThis.location.href = data.url;
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
          {/* Airbnb-style: Show total prominently */}
          <div className="bg-primary/5 p-6 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-2">Total due</p>
            <p className="text-3xl font-bold text-primary mb-2">
              £{totalAmount?.toFixed(2)}
            </p>
            <button
              onClick={() => setBreakdownOpen(true)}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
              type="button"
            >
              View price breakdown
            </button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Secure payment</p>
            <p>
              The deposit secures your booking and will be held in escrow
              until job completion. You&apos;ll pay the remaining balance after the work is done.
            </p>
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
              `Pay £${totalAmount?.toFixed(2)}`
            )}
          </Button>
        </DialogFooter>

        <PriceBreakdownModal
          isOpen={breakdownOpen}
          onClose={() => setBreakdownOpen(false)}
          quoteAmount={depositAmount}
          customerFee={customerFee}
          total={totalAmount}
          title="Deposit Payment Breakdown"
        />
      </DialogContent>
    </Dialog>
  );
}
