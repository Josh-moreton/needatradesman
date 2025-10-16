"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormLabel } from "@/components/ui/form";
import { X, Plus, Trash2 } from "lucide-react";
import { QuoteItem } from "@/lib/schemas";
import { toast } from "sonner";
import { createLogger } from '@/lib/logger';

const logger = createLogger('template-modal');

interface TemplateModalProps {
  onTemplateAdded: () => void;
}

interface QuoteTemplate {
  id: string;
  name: string;
  items: {
    id: string;
    description: string;
    price: number;
  }[];
}

export function TemplateModal({ onTemplateAdded }: TemplateModalProps) {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch templates whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/quote-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      logger.error({ error }, "Error fetching templates");
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  // Add new item to form
  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  };

  // Update item in form
  const updateItem = (index: number, field: keyof QuoteItem, value: string) => {
    const updated = items.map((item, i) =>
      i === index
        ? {
            ...item,
            [field]: field === "description" ? value : Number(value),
          }
        : item
    );
    setItems(updated);
  };

  // Remove item from form
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    } else {
      toast.error("Template must have at least one item");
    }
  };

  // Create new template
  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Please enter a template name");
      return;
    }

    if (items.some((item) => !item.description.trim())) {
      toast.error("All items must have a description");
      return;
    }

    try {
      setCreating(true);
      const response = await fetch("/api/quote-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          items: items,
        }),
      });

      if (!response.ok) throw new Error("Failed to create template");

      const newTemplate = await response.json();
      setTemplates([...templates, newTemplate]);
      setCreating(false);
      setTemplateName("");
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      toast.success("Template created successfully");
      onTemplateAdded();
      setIsOpen(false);
    } catch (error) {
      logger.error({ error }, "Error creating template");
      toast.error("Failed to create template");
      setCreating(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const response = await fetch(`/api/quote-templates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete template");

      setTemplates(templates.filter((t) => t.id !== id));
      toast.success("Template deleted successfully");
      onTemplateAdded();
    } catch (error) {
      logger.error({ error }, "Error deleting template");
      toast.error("Failed to delete template");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline">
          Manage Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Quote Templates</DialogTitle>
          <DialogDescription>
            Create and manage your quote templates for quick responses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Existing Templates */}
          <div>
            <h3 className="text-lg font-medium mb-4">Your Templates</h3>
            {loading ? (
              <p>Loading templates...</p>
            ) : templates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No templates yet. Create your first one below.
              </p>
            ) : (
              <div className="grid gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-md p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTemplate(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-sm space-y-1">
                      {template.items.map((item, i) => (
                        <div
                          key={item.id || i}
                          className="flex justify-between"
                        >
                          <span>{item.description}</span>
                          <span>£{Number(item.price).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-1 mt-2 font-medium">
                        Total: £
                        {template.items
                          .reduce((sum, item) => sum + Number(item.price), 0)
                          .toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create new template form */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-4">Create New Template</h3>
            <div className="space-y-4">
              <div>
                <FormLabel>Template Name</FormLabel>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Standard Bathroom Installation"
                />
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Items</h4>

                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <FormLabel>Description</FormLabel>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        placeholder="Item description"
                      />
                    </div>
                    <div>
                      <FormLabel>Qty</FormLabel>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value)
                        }
                        className="w-20"
                      />
                    </div>
                    <div>
                      <FormLabel>Unit £</FormLabel>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(index, "unitPrice", e.target.value)
                        }
                        className="w-24"
                        step="0.01"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      className="mb-1"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addItem}
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> Add Item
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button onClick={handleCreateTemplate} disabled={creating}>
            {creating ? "Creating..." : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
