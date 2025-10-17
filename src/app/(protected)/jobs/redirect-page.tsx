import { redirect } from "next/navigation";

// This page redirects to the new tradesperson route structure
export default function OldJobsPageRedirect() {
  redirect("/tradesperson/jobs");
}
