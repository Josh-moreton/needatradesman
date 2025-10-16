"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createJobSchema, type CreateJobInput } from "@/lib/schemas";
import { JobCategory } from "@prisma/client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categoryOptions = [
  { value: JobCategory.PLUMBING, label: "Plumbing" },
  { value: JobCategory.ELECTRICAL, label: "Electrical" },
  { value: JobCategory.CARPENTRY, label: "Carpentry" },
  { value: JobCategory.BRICKLAYING, label: "Bricklaying" },
  { value: JobCategory.PLASTERING, label: "Plastering" },
  { value: JobCategory.PAINTING, label: "Painting" },
  { value: JobCategory.LANDSCAPING, label: "Landscaping" },
  { value: JobCategory.CLEANING, label: "Cleaning" },
  { value: JobCategory.HANDYMAN, label: "Handyman" },
  { value: JobCategory.OTHER, label: "Other" },
];

export function JobForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const form = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      location: "",
      budget: undefined,
    },
  });

  async function onSubmit(data: CreateJobInput) {
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create job");
      }

      await response.json();

      toast.success("Job posted successfully!");
      
      // Redirect to job management page
      router.push("/customer/jobs/my-jobs");
      router.refresh();
    } catch (error) {
      console.error("Error creating job:", error);
      
      // Handle different error types with specific messages
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        // Rate limit errors
        if (errorMessage.includes("rate limit")) {
          toast.error("Too many job postings. Please wait before posting again.");
        }
        // Authentication errors
        else if (errorMessage.includes("unauthorized") || errorMessage.includes("not found")) {
          toast.error("Authentication error. Please sign in again.");
        }
        // Permission errors
        else if (errorMessage.includes("only customers")) {
          toast.error("Only customers can create jobs. Please check your account type.");
        }
        // Validation errors
        else if (errorMessage.includes("invalid") || errorMessage.includes("required")) {
          toast.error("Please check your job details and try again.");
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Fix leaking kitchen tap" {...field} />
              </FormControl>
              <FormDescription>
                A clear, descriptive title for your job (max 100 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the work you need done in detail..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Provide details about the work, timeline, and any specific
                requirements (10-1000 characters)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoryOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Choose the category that best matches your job
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. SW1A 1AA or Central London"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Your postcode or general area where the work needs to be done
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="budget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget (Optional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 150"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                />
              </FormControl>
              <FormDescription>
                Your estimated budget in GBP (leave blank if you prefer quotes)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Creating Job..." : "Post Job"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
