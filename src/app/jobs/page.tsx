import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function JobsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect("/sign-in");
  }
  
  // Redirect to appropriate dashboard based on user role
  if (user.role === "CUSTOMER") {
    redirect("/customer");
  } else if (user.role === "TRADESPERSON") {
    redirect("/tradesperson");
  } else {
    redirect("/onboarding");
  }
}