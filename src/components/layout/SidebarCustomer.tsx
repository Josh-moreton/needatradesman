"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User } from "@prisma/client";
import { PlusCircle, FileText, MessageSquare, Home } from "lucide-react";

interface SidebarCustomerProps {
  user: User;
}

export function SidebarCustomer({ user }: SidebarCustomerProps) {
  const pathname = usePathname();

  const customerLinks = [
    {
      href: "/dashboard",
      label: "Home",
      icon: Home,
    },
    {
      href: "/dashboard/jobs/new",
      label: "Post Job",
      icon: PlusCircle,
    },
    {
      href: "/dashboard/my-jobs",
      label: "My Jobs",
      icon: FileText,
    },
    {
      href: "/dashboard/messages",
      label: "Messages",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="hidden border-r bg-sidebar border-sidebar md:block w-64">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold text-sidebar-foreground"
          >
            <span className="">Customer Dashboard</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {customerLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  {
                    "bg-sidebar-accent text-sidebar-primary": pathname === href,
                  }
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
            <div className="font-medium">
              {user.firstName} {user.lastName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
