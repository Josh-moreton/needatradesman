import { getCurrentUser } from "@/lib/auth";
import Dashboard from "@/components/dashboard/Dashboard";

// This page uses authentication, so it should be dynamically rendered
export const dynamic = "force-dynamic";

export default async function TradespersonDashboardPage() {
  const user = await getCurrentUser();

  return <Dashboard user={user!} />;
}
