"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QuoteItem } from "@/lib/schemas";
import { TemplateModal } from "@/components/quotes/TemplateModal";

interface QuoteTemplate {
  id: string;
  name: string;
  items: {
    id: string;
    description: string;
    price: number;
  }[];
}

interface QuoteBuilderProps {
  value: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
  depositPercentage?: number;
  onDepositPercentageChange?: (value: number) => void;
  requiresDeposit?: boolean;
  onRequiresDepositChange?: (value: boolean) => void;
  userId?: string; // Optional user ID for fetching templates
  showTemplates?: boolean; // Whether to show template selection
}

export function QuoteBuilder({
  value,
  onChange,
  depositPercentage = 50,
  onDepositPercentageChange,
  requiresDeposit = true,
  onRequiresDepositChange,
  userId,
  showTemplates = false,
}: QuoteBuilderProps) {
  const [items, setItems] = useState<QuoteItem[]>(value);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);

  useEffect(() => {
    onChange(items);
  }, [items, onChange]);

  // Function to fetch templates
  const fetchTemplates = async () => {
    if (showTemplates && userId) {
      setIsLoadingTemplates(true);
      try {
        const response = await fetch("/api/quote-templates");
        if (!response.ok) throw new Error("Failed to fetch templates");
        const data = await response.json();
        setTemplates(data);
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setIsLoadingTemplates(false);
      }
    }
  };

  // Fetch templates if userId is provided
  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, showTemplates]);

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

  // Handle template selection
  const handleTemplateSelection = (templateId: string) => {
    const selectedTemplate = templates.find((t) => t.id === templateId);
    if (selectedTemplate) {
      // Convert template items to quote items
      const newItems = selectedTemplate.items.map((item) => ({
        description: item.description,
        quantity: 1,
        unitPrice: parseFloat(item.price.toString()),
      }));
      setItems(newItems);
    }
  };

  return (
    <div className="space-y-4">
      {showTemplates && (
        <div className="mb-4">
          <FormLabel>Quote Templates</FormLabel>
          <div className="flex gap-2">
            <Select
              onValueChange={handleTemplateSelection}
              disabled={isLoadingTemplates}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    isLoadingTemplates
                      ? "Loading templates..."
                      : "Select a template"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {userId && (
              <TemplateModal onTemplateAdded={fetchTemplates} />
            )}
          </div>
        </div>
      )}

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
