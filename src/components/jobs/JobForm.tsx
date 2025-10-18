"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { LocationInput } from "@/components/ui/location-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createLogger } from '@/lib/logger';

const logger = createLogger('job-form');

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
    mode: "onSubmit", // Only validate on submit to avoid premature errors
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      location: "",
      locationData: undefined,
      budget: undefined,
    },
  });

  async function onSubmit(data: CreateJobInput) {
    setIsSubmitting(true);

    try {
      // Log the data being submitted for debugging
      logger.debug({ 
        data,
        hasLocationData: !!data.locationData,
        hasLocation: !!data.location,
        locationDataValue: data.locationData,
        locationValue: data.location
      }, "Submitting job form");

      // If locationData is provided, use it for location display
      const jobData = {
        ...data,
        location: data.locationData?.displayText || data.location,
      };

      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(jobData),
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
      logger.error({ error }, "Error creating job");
      
      // Handle different error types
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
          toast.error("Network error. Please check your connection and try again.");
        } else if (errorMessage.includes("validation")) {
          toast.error("Validation error. Please check your input and try again.");
        } else if (errorMessage.includes("rate limit")) {
          toast.error("Too many requests. Please wait a moment and try again.");
        } else if (errorMessage.includes("unauthorized") || errorMessage.includes("authentication")) {
          toast.error("Authentication error. Please sign in and try again.");
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Something went wrong. Please try again.");
      }
      
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const onError = (errors: Record<string, unknown>) => {
    logger.warn({ 
      errors,
      formValues: form.getValues(),
      locationData: form.getValues("locationData"),
      location: form.getValues("location"),
    }, "Job form validation errors");
    // Show a generic message; field-level messages render via <FormMessage />
    toast.error("Please fix the highlighted fields and try again.");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
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
              <Select onValueChange={field.onChange} value={field.value}>
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
          name="locationData"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <LocationInput
                  value={field.value}
                  onChange={(locationData) => {
                    logger.debug({ 
                      locationData,
                      hasPlaceId: !!locationData?.id 
                    }, "Location selected");
                    // Normalize null to undefined so it satisfies zod.optional
                    field.onChange(locationData ?? undefined);
                    // Also update the legacy location field for backwards compatibility
                    // Use shouldValidate: false here to avoid premature validation
                    form.setValue(
                      "location",
                      locationData?.displayText || "",
                      { shouldValidate: false, shouldDirty: true }
                    );
                    // Manually trigger validation after both values are set
                    // This ensures the superRefine check sees the Place ID
                    if (locationData?.id) {
                      form.clearErrors(["location", "locationData"]);
                    }
                  }}
                  placeholder="Enter location or use current location"
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>
                Your postcode or area. Select a location from the dropdown to continue.
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
                  value={field.value ?? ""}
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

        <div className="flex gap-4 pt-4 relative z-50">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
            onMouseDown={() => {
              // Blur any focused element (e.g., autocomplete dropdown) so overlays close before click
              const el = document.activeElement as HTMLElement | null;
              el?.blur?.();
            }}
            onClick={() => logger.debug("Submit clicked")}
          >
            {isSubmitting ? "Creating Job..." : "Post Job"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className=""
            onClick={() => router.back()}
            disabled={isSubmitting}
            onMouseDown={() => {
              const el = document.activeElement as HTMLElement | null;
              el?.blur?.();
            }}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
