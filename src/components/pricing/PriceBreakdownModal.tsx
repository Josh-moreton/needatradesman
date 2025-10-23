"use client";

import { formatPence } from "@/lib/pricing";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PriceBreakdownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalPence: number;
  subtotalPence: number;
  customerFeePence: number;
}

export function PriceBreakdownModal({
  open,
  onOpenChange,
  totalPence,
  subtotalPence,
  customerFeePence,
}: PriceBreakdownModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Price breakdown</DialogTitle>
          <DialogDescription>
            Detailed breakdown of your total payment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Project subtotal</span>
              <span className="font-medium">{formatPence(subtotalPence)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span>Customer service fee</span>
              <span className="font-medium">{formatPence(customerFeePence)}</span>
            </div>

            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">{formatPence(totalPence)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            The customer service fee helps us maintain the platform and provide support throughout your project.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
