import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChatInterface } from "@/components/messages/ChatInterface";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.role) {
    redirect("/onboarding");
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      <ErrorBoundary>
        <ChatInterface currentUserId={user.id} />
      </ErrorBoundary>
    </div>
  );
}
