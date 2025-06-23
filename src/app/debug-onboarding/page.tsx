import { redirect } from "next/navigation";
import { currentUser, clerkClient } from "@clerk/nextjs/server";

export default async function DebugOnboardingPage() {
  const user = await currentUser();
  
  if (!user) {
    redirect("/sign-in");
  }

  // Check current metadata
  const metadata = user.publicMetadata;
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Onboarding Status</h1>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">User ID:</h2>
        <p>{user.id}</p>
      </div>
      
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Current Public Metadata:</h2>
        <pre className="bg-gray-100 p-2 rounded">
          {JSON.stringify(metadata, null, 2)}
        </pre>
      </div>
      
      <form action={async () => {
        "use server";
        
        if (!user) return;
        
        const client = await clerkClient();
        await client.users.updateUserMetadata(user.id, {
          publicMetadata: { 
            ...user.publicMetadata,
            onboardingComplete: true 
          }
        });
        
        redirect("/dashboard");
      }}>
        <button 
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Force Set Onboarding Complete
        </button>
      </form>
    </div>
  );
}
