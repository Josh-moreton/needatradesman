import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client"; // Use Prisma enum instead
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
    return;
  }

  if (!user.role) {
    redirect("/onboarding");
    return;
  }

  if (user.role !== UserRole.TRADESPERSON) {
    redirect("/customer");
    return;
  }

  return (
    <div className="flex h-screen bg-background">
      <SidebarTradesperson user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
