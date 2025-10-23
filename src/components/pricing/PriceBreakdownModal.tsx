"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { STRIPE_CONFIG } from "@/lib/stripe";

interface PriceBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  quoteAmount: number;
  customerFee: number;
  total: number;
  title?: string;
}

export function PriceBreakdownModal({
  isOpen,
  onClose,
  quoteAmount,
  customerFee,
  total,
  title = "Price Breakdown",
}: PriceBreakdownModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Detailed breakdown of your payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Project cost:</span>
            <span className="font-medium">£{quoteAmount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Service fee ({STRIPE_CONFIG.customerFeePercentage}%):
            </span>
            <span className="font-medium">£{customerFee.toFixed(2)}</span>
          </div>

          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold text-lg">£{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
            <p>
              The service fee helps us maintain the platform, provide customer support, 
              and ensure secure payment processing.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
