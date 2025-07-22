"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { QuoteItem } from "@/lib/schemas";

interface QuoteBuilderProps {
  value: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
  depositPercentage?: number;
  onDepositPercentageChange?: (value: number) => void;
  requiresDeposit?: boolean;
  onRequiresDepositChange?: (value: boolean) => void;
}

export function QuoteBuilder({
  value,
  onChange,
  depositPercentage = 50,
  onDepositPercentageChange,
  requiresDeposit = true,
  onRequiresDepositChange,
}: QuoteBuilderProps) {
  const [items, setItems] = useState<QuoteItem[]>(value);

  useEffect(() => {
    onChange(items);
  }, [items, onChange]);

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateItem = (index: number, field: keyof QuoteItem, val: string) => {
    const updated = items.map((item, i) =>
      i === index
        ? { ...item, [field]: field === "description" ? val : Number(val) }
        : item
    );
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const depositAmount = requiresDeposit ? (total * depositPercentage) / 100 : 0;

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-end">
          <div className="flex-1">
            <FormLabel>Description</FormLabel>
            <Input
              value={item.description}
              onChange={(e) => updateItem(index, "description", e.target.value)}
            />
          </div>
          <div>
            <FormLabel>Qty</FormLabel>
            <Input
              type="number"
              value={item.quantity}
              onChange={(e) => updateItem(index, "quantity", e.target.value)}
              className="w-20"
            />
          </div>
          <div>
            <FormLabel>Unit £</FormLabel>
            <Input
              type="number"
              value={item.unitPrice}
              onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
              className="w-24"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => removeItem(index)}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addItem}>
        Add Item
      </Button>

      <div className="border-t pt-4 mt-4">
        <div className="font-medium">Total: £{total.toFixed(2)}</div>

        {onRequiresDepositChange && (
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox
              id="requires-deposit"
              checked={requiresDeposit}
              onCheckedChange={(checked) =>
                onRequiresDepositChange(
                  checked === true || checked === "indeterminate"
                )
              }
            />
            <FormLabel htmlFor="requires-deposit" className="cursor-pointer">
              Require deposit payment
            </FormLabel>
          </div>
        )}

        {requiresDeposit && onDepositPercentageChange && (
          <div className="mt-2">
            <FormLabel>Deposit percentage</FormLabel>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={depositPercentage}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    onDepositPercentageChange(value);
                  }
                }}
                className="w-20"
                min={0}
                max={100}
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Deposit amount: £{depositAmount.toFixed(2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
