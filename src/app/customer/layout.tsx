import { getCurrentUser } from "@/lib/auth";
import { UserRole } from "@/lib/schemas";
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
  }

  if (!user.role) {
    redirect("/onboarding");
  }

  if (user.role !== UserRole.CUSTOMER) {
    redirect("/tradesperson");
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <SidebarCustomer user={user} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
