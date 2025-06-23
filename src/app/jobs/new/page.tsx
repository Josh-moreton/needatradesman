import { redirect } from "next/navigation";

// This page redirects to the new customer route structure
export default function OldNewJobPage() {
  redirect("/customer/jobs/new");
}
