import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { UserRole } from "@/lib/schemas";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: UserRole;
}

export default function DashboardLayout({
  children,
  userRole,
}: DashboardLayoutProps) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <Sidebar userRole={userRole} />
      <div className="flex flex-col">
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
