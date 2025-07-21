"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { QuoteItem } from "@/lib/schemas";

interface QuoteBuilderProps {
  value: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
}

export function QuoteBuilder({ value, onChange }: QuoteBuilderProps) {
  const [items, setItems] = useState<QuoteItem[]>(value);

  useEffect(() => {
    onChange(items);
  }, [items, onChange]);

  const addItem = () => {
    setItems([
      ...items,
      { description: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const updateItem = (index: number, field: keyof QuoteItem, val: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, [field]: field === "description" ? val : Number(val) } : item
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
          <Button type="button" variant="destructive" onClick={() => removeItem(index)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addItem}>
        Add Item
      </Button>
      <div className="font-medium pt-2">Total: £{total.toFixed(2)}</div>
    </div>
  );
}
