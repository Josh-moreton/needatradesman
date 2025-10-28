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
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createLogger } from '@/lib/logger';
import { calculateCustomerFee } from '@/lib/stripe';
import { PriceBreakdownModal } from "@/components/pricing/PriceBreakdownModal";

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
}: Readonly<FinalPaymentModalProps>) {
  const [loading, setLoading] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const remainingAmount = fullAmount - depositAmount;
  
  // Calculate customer platform fee using centralized function
  const customerFeeInPence = calculateCustomerFee(remainingAmount);
  const customerFee = customerFeeInPence / 100; // Convert pence to pounds for display
  const totalDue = remainingAmount + customerFee;

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

        {/* Airbnb-style: Show total prominently */}
        <div className="bg-primary/5 p-6 rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-2">Final payment due</p>
          <p className="text-3xl font-bold text-primary mb-2">
            £{totalDue.toFixed(2)}
          </p>
          <button
            onClick={() => setBreakdownOpen(true)}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
            type="button"
          >
            View price breakdown
          </button>
        </div>

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="bg-muted p-3 rounded-md">
            <p className="font-medium mb-1 text-foreground">Payment Details:</p>
            <ul className="space-y-1 text-xs">
              <li>• This is the final payment for your completed job</li>
              <li>• Remaining balance after your deposit</li>
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
                Pay £{totalDue.toFixed(2)}
              </>
            )}
          </Button>
        </DialogFooter>

        <PriceBreakdownModal
          isOpen={breakdownOpen}
          onClose={() => setBreakdownOpen(false)}
          quoteAmount={remainingAmount}
          customerFee={customerFee}
          total={totalDue}
          title="Final Payment Breakdown"
        />
      </DialogContent>
    </Dialog>
  );
}