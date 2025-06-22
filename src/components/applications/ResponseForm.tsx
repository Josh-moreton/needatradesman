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

interface ResponseFormProps {
  jobId: string;
}

export function ResponseForm({ jobId }: ResponseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  const form = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: {
      message: "",
      quote: undefined,
    },
  });

  async function onSubmit(data: CreateApplicationInput) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
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
            onClick={() => router.push(`/messages?jobId=${jobId}`)}
            className="w-full"
          >
            Start Conversation
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
