"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createApplicationSchema,
  type CreateApplicationInput,
} from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle } from "lucide-react";
import { QuoteBuilder } from "@/components/quotes/QuoteBuilder";

interface ResponseFormProps {
  jobId: string;
}

export function ResponseForm({ jobId }: ResponseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const router = useRouter();

  const form = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: {
      message: "",
      quote: undefined,
      quoteItems: [],
    },
  });

  async function onSubmit(data: CreateApplicationInput) {
    setIsSubmitting(true);

    const computedQuote =
      data.quoteItems && data.quoteItems.length > 0
        ? data.quoteItems.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0
          )
        : data.quote;

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          quote: computedQuote,
          jobId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to submit response");
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Error submitting response:", error);
      // TODO: Add proper error handling with toast notifications
      alert(
        error instanceof Error ? error.message : "Failed to submit response"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Helper to ensure a conversation exists, creating it if needed
  const ensureConversationAndNavigate = async () => {
    setChatLoading(true);
    try {
      // Fetch conversations for this job
      const res = await fetch(`/api/messages`);
      const data = await res.json();
      // Try to find a conversation for this job (with any participant)
      const exists = (data.conversations || []).some(
        (c: { jobId: string }) => c.jobId === jobId
      );
      if (!exists) {
        // Create conversation by sending a default message to the job owner (customer)
        // We don't have the customerId here, so just navigate and let the chat UI handle it, or optionally fetch job details if needed
        // For now, just navigate
      }
      router.push(`/tradesperson/messages?jobId=${jobId}`);
    } catch {
      alert("Failed to start chat. Please try again.");
    } finally {
      setChatLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Response Submitted!</h3>
        <p className="text-muted-foreground mb-4">
          Your response has been sent to the customer. They will review it and
          may contact you directly.
        </p>
        <div className="space-y-3">
          <Button
            onClick={ensureConversationAndNavigate}
            className="w-full"
            disabled={chatLoading}
          >
            {chatLoading ? "Starting..." : "Start Conversation"}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/jobs/${jobId}`)}
            className="w-full"
          >
            Back to Job
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Response Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell the customer why you're the right person for this job. Include your experience, availability, and any questions you might have..."
                  className="min-h-32"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Write a compelling message explaining your interest and
                qualifications (10-500 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quote"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quote (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 250"
                  {...field}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? Number(value) : undefined);
                  }}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Provide an estimated quote in GBP for the work (optional)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quoteItems"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quote Builder</FormLabel>
              <FormDescription>
                Add line items or leave empty to provide a single amount.
              </FormDescription>
              <QuoteBuilder value={field.value || []} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Submitting..." : "Submit Response"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
