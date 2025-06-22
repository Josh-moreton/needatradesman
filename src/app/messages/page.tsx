import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default async function MessagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.role) {
    redirect("/onboarding");
  }

  return (
    <DashboardLayout userRole={user.role}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold">Messages</h1>
        <p className="text-muted-foreground mt-2">
          Your messages will appear here.
        </p>
      </div>
    </DashboardLayout>
  );
}
