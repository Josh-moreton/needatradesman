"use client";

import { useState } from "react";
import { formatPence } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { PriceBreakdownModal } from "@/components/pricing/PriceBreakdownModal";

interface CustomerTotalProps {
  totalPence: number;
  subtotalPence?: number;
  customerFeePence?: number;
  showBreakdown?: boolean;
}

export function CustomerTotal({
  totalPence,
  subtotalPence,
  customerFeePence,
  showBreakdown = true,
}: CustomerTotalProps) {
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const total = formatPence(totalPence);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-sm text-muted-foreground">Total to pay</span>
      </div>
      
      <p className="text-xs text-muted-foreground">
        Taxes/fees included where applicable
      </p>

      {showBreakdown && subtotalPence && customerFeePence && (
        <>
          <Button
            variant="link"
            size="sm"
            onClick={() => setIsBreakdownOpen(true)}
            className="h-auto p-0 text-xs"
          >
            View price breakdown
          </Button>

          <PriceBreakdownModal
            open={isBreakdownOpen}
            onOpenChange={setIsBreakdownOpen}
            totalPence={totalPence}
            subtotalPence={subtotalPence}
            customerFeePence={customerFeePence}
          />
        </>
      )}
    </div>
  );
}
