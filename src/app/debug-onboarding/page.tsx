import { redirect } from "next/navigation";
import { currentUser, clerkClient, auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export default async function DebugOnboardingPage() {
  const user = await currentUser();
  const { sessionClaims } = await auth();

  if (!user) {
    redirect("/sign-in");
  }

  // Check current metadata
  const metadata = user.publicMetadata;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug Onboarding Status</h1>

      <div className="space-y-6">
        <div className="bg-white p-4 rounded border">
          <h2 className="text-lg font-semibold">User ID:</h2>
          <p className="font-mono">{user.id}</p>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="text-lg font-semibold">
            Current Public Metadata (from currentUser):
          </h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </div>

        <div className="bg-white p-4 rounded border">
          <h2 className="text-lg font-semibold">Session Claims (from auth):</h2>
          <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
            {JSON.stringify(sessionClaims, null, 2)}
          </pre>
        </div>

        <div className="space-y-4">
          <form
            action={async () => {
              "use server";

              if (!user) return;

              const client = await clerkClient();
              await client.users.updateUserMetadata(user.id, {
                publicMetadata: {
                  ...user.publicMetadata,
                  onboardingComplete: true,
                },
              });

              // Wait a moment for propagation
              await new Promise((resolve) => setTimeout(resolve, 1000));

              // Check user role and redirect appropriately
              const updatedUser = await prisma.user.findUnique({
                where: { clerkId: user.id },
              });

              if (updatedUser?.role === "CUSTOMER") {
                redirect("/customer");
              } else if (updatedUser?.role === "TRADESPERSON") {
                redirect("/tradesperson");
              } else {
                redirect("/onboarding");
              }
            }}
          >
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
            >
              Force Set Onboarding Complete & Redirect
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <a
              href="/customer?bypass_onboarding=true"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-center block"
            >
              Customer Dashboard (Bypass)
            </a>
            <a
              href="/tradesperson?bypass_onboarding=true"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-center block"
            >
              Tradesperson Dashboard (Bypass)
            </a>
            <a
              href="/customer"
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 text-center block"
            >
              Customer Dashboard
            </a>
            <a
              href="/tradesperson"
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 text-center block"
            >
              Tradesperson Dashboard
            </a>
            <a
              href="/onboarding"
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-center block"
            >
              Onboarding
            </a>
          </div>

          <a
            href="/debug-onboarding"
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 w-full text-center block"
          >
            Refresh Page
          </a>
        </div>
      </div>
    </div>
  );
}
