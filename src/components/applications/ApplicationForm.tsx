"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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

interface ApplicationFormProps {
  jobId: string;
}

export function ApplicationForm({ jobId }: ApplicationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const form = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: {
      message: "",
      quote: undefined,
      quoteItems: [],
      depositPercentage: 50,
      requiresDeposit: true,
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
        throw new Error(error || "Failed to submit application");
      }

      setIsSuccess(true);
      toast.success("Application submitted successfully!");

      // Redirect after a short delay
      setTimeout(() => {
        router.push(`/jobs/${jobId}`);
        router.refresh();
      }, 2000);
    } catch (error) {
      console.error("Error submitting application:", error);
      
      // Handle different error types with specific messages
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Rate limit errors
        if (errorMessage.includes("rate limit")) {
          toast.error("Too many applications. Please wait before submitting again.");
        }
        // Authentication errors
        else if (errorMessage.includes("unauthorized") || errorMessage.includes("not found")) {
          toast.error("Authentication error. Please sign in again.");
        }
        // Validation errors
        else if (errorMessage.includes("invalid") || errorMessage.includes("required")) {
          toast.error("Please check your application details and try again.");
        }
        // Already applied
        else if (errorMessage.includes("already applied")) {
          toast.error("You have already applied to this job.");
        }
        // Job status errors
        else if (errorMessage.includes("no longer accepting")) {
          toast.error("This job is no longer accepting applications.");
        }
        // Generic error from server
        else {
          toast.error(error.message);
        }
      } else {
        // Network or unknown errors
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Application Submitted!</h3>
        <p className="text-muted-foreground mb-4">
          Your application has been sent to the customer. They will review it
          and may contact you directly.
        </p>
        <p className="text-sm text-muted-foreground">
          Redirecting you back to the job...
        </p>
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
              <FormLabel>Application Message</FormLabel>
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
              <QuoteBuilder
                value={field.value || []}
                onChange={field.onChange}
                depositPercentage={form.watch("depositPercentage")}
                onDepositPercentageChange={(value) =>
                  form.setValue("depositPercentage", value)
                }
                requiresDeposit={form.watch("requiresDeposit")}
                onRequiresDepositChange={(value) =>
                  form.setValue("requiresDeposit", value)
                }
              />
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
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
