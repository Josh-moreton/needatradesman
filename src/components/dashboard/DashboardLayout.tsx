import Link from "next/link";
import { UserRole } from "@prisma/client";
import { ReactNode } from "react";
import {
  Briefcase,
  FileText,
  MessageSquare,
  PlusCircle,
  User,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: UserRole;
}

const navItems = [
  {
    label: "Dashboard Home",
    href: "/dashboard",
    icon: <Briefcase className="h-5 w-5" />,
  },
  {
    label: "My Jobs",
    href: "/jobs/my-jobs",
    icon: <Briefcase className="h-5 w-5" />,
    roles: ["CUSTOMER"],
  },
  {
    label: "Post Job",
    href: "/jobs/new",
    icon: <PlusCircle className="h-5 w-5" />,
    roles: ["CUSTOMER"],
  },
  {
    label: "Browse Jobs",
    href: "/jobs",
    icon: <Briefcase className="h-5 w-5" />,
    roles: ["TRADESPERSON"],
  },
  {
    label: "Applications",
    href: "/applications",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    label: "Messages",
    href: "/messages",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: <User className="h-5 w-5" />,
  },
];

export default function DashboardLayout({
  children,
  userRole,
}: DashboardLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border p-6 hidden md:flex flex-col gap-4">
        <nav className="flex flex-col gap-2">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(userRole))
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-6 overflow-x-auto">{children}</main>
    </div>
  );
}
