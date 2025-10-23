"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface QuoteFeesPopoverProps {
  platformFeePercentage?: number;
  processorFeePercentage?: number;
}

export function QuoteFeesPopover({
  platformFeePercentage = 1.6,
  processorFeePercentage = 1.4,
}: QuoteFeesPopoverProps) {
  const totalFeePercentage = platformFeePercentage + processorFeePercentage;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          aria-label="Fee information"
        >
          <Info className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-2">How fees work</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Platform fee:</span>
                <span className="font-medium text-foreground">{platformFeePercentage}%</span>
              </div>
              <div className="flex justify-between">
                <span>Card processing fee:</span>
                <span className="font-medium text-foreground">{processorFeePercentage}%</span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span>Total fees:</span>
                <span className="font-semibold text-foreground">{totalFeePercentage}%</span>
              </div>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Fees apply to each charge (deposit/balance if split).
            </p>
            <p>
              Set a net target to ensure you receive the amount you expect after fees.
            </p>
            <p className="italic">
              Fees and totals shown are estimates until payment is processed.
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
