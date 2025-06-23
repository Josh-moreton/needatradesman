import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/schemas";
import { redirect } from "next/navigation";
import { SidebarTradesperson } from "@/components/layout/SidebarTradesperson";

export default async function TradespersonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Protect tradesperson routes
  if (!user) {
    redirect("/sign-in");
  }

  if (!user.role) {
    redirect("/onboarding");
  }

  if (user.role !== UserRole.TRADESPERSON) {
    redirect("/customer");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <SidebarTradesperson user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
