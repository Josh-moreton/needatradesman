import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { SidebarCustomer } from "@/components/layout/SidebarCustomer";
import { SidebarTradesperson } from "@/components/layout/SidebarTradesperson";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Authentication check
  if (!user) {
    redirect("/sign-in");
    return;
  }

  // Role check - redirect to onboarding if no role
  if (!user.role) {
    redirect("/onboarding");
    return;
  }

  // Validate role is one of the expected values
  if (user.role !== UserRole.CUSTOMER && user.role !== UserRole.TRADESPERSON) {
    redirect("/onboarding");
    return;
  }

  // Render appropriate sidebar based on role
  const SidebarComponent =
    user.role === UserRole.CUSTOMER ? SidebarCustomer : SidebarTradesperson;

  return (
    <div className="flex h-screen bg-background">
      <SidebarComponent user={user} />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
