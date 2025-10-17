import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@prisma/client"; // Use Prisma enum instead
import { redirect } from "next/navigation";
import { SidebarCustomer } from "@/components/layout/SidebarCustomer";

export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Protect customer routes
  if (!user) {
    redirect("/sign-in");
    return;
  }

  if (!user.role) {
    redirect("/onboarding");
    return;
  }

  if (user.role !== UserRole.CUSTOMER) {
    redirect("/tradesperson");
    return;
  }

  return (
    <div className="flex h-screen bg-background">
      <SidebarCustomer user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
