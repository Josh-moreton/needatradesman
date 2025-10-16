import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/messages/ChatInterface";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function DashboardMessagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
    return;
  }

  if (!user.role) {
    redirect("/onboarding");
    return;
  }

  // Messages work the same for both customer and tradesperson roles
  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      <ChatInterface currentUserId={user.id} />
    </div>
  );
}
