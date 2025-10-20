import { getAuthGate } from "@/lib/auth-gate";
import { redirect } from "next/navigation";
import { ChatInterface } from "@/components/messages/ChatInterface";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function DashboardMessagesPage() {
  const gate = await getAuthGate();

  if (!gate) {
    redirect("/sign-in");
    return;
  }

  // The layout handles the onboarding flow if gate.role is null
  // If we reach here, user has a role (layout ensures this)

  // Messages work the same for both customer and tradesperson roles
  return (
    <div className="container mx-auto px-4 py-8 bg-background min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      <ErrorBoundary>
        <ChatInterface currentUserId={gate.userId} />
      </ErrorBoundary>
    </div>
  );
}
