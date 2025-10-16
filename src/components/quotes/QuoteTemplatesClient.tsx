"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { QuoteItem, quoteItemSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { createLogger } from '@/lib/logger';

const logger = createLogger('quote-templates-client');

// Template creation form schema
const templateFormSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  items: z.array(quoteItemSchema).min(1, "At least one item is required"),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface QuoteTemplate {
  id: string;
  name: string;
  items: {
    id: string;
    description: string;
    price: number;
  }[];
}

export default function QuoteTemplatesClient() {
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [items, setItems] = useState<QuoteItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ]);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      name: "",
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
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

    fetchTemplates();
  }, []);

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
  const handleCreateTemplate = async (values: TemplateFormValues) => {
    try {
      setCreating(true);
      const response = await fetch("/api/quote-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          items: items,
        }),
      });

      if (!response.ok) throw new Error("Failed to create template");

      const newTemplate = await response.json();
      setTemplates([...templates, newTemplate]);
      setCreating(false);
      setItems([{ description: "", quantity: 1, unitPrice: 0 }]);
      form.reset();
      toast.success("Template created successfully");
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
    } catch (error) {
      logger.error({ error }, "Error deleting template");
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-8">
      {/* Templates list */}
      <div>
        <h2 className="text-xl font-medium mb-4">Your Quote Templates</h2>
        {loading ? (
          <p>Loading templates...</p>
        ) : templates.length === 0 ? (
          <p>You don&apos;t have any templates yet. Create your first one below.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>{template.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      Delete
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {template.items.map((item, i) => (
                      <div
                        key={item.id || i}
                        className="flex justify-between text-sm"
                      >
                        <span>{item.description}</span>
                        <span>£{Number(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 font-medium">
                      Total: £
                      {template.items
                        .reduce((sum, item) => sum + Number(item.price), 0)
                        .toFixed(2)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create new template form */}
      <div>
        <h2 className="text-xl font-medium mb-4">Create New Template</h2>
        <Card>
          <CardContent className="pt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleCreateTemplate)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Kitchen Renovation"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="space-y-6">
                  <h3 className="font-medium">Items</h3>

                  {items.map((item, index) => (
                    <div key={index} className="flex gap-4 items-end">
                      <div className="flex-1">
                        <FormLabel className="block mb-2">
                          Description
                        </FormLabel>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(index, "description", e.target.value)
                          }
                          placeholder="Item description"
                        />
                      </div>
                      <div>
                        <FormLabel className="block mb-2">Qty</FormLabel>
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
                        <FormLabel className="block mb-2">Unit £</FormLabel>
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
                </div>

                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Template"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
