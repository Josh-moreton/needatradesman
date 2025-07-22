"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User } from "@prisma/client";
import {
  BarChart3,
  Briefcase,
  FileText,
  MessageSquare,
  Home,
  DollarSign,
} from "lucide-react";

interface SidebarTradespersonProps {
  user: User;
}

export function SidebarTradesperson({ user }: SidebarTradespersonProps) {
  const pathname = usePathname();

  const tradespersonLinks = [
    {
      href: "/tradesperson",
      label: "Home",
      icon: Home,
    },
    {
      href: "/tradesperson/dashboard",
      label: "Dashboard",
      icon: BarChart3,
    },
    {
      href: "/tradesperson/jobs",
      label: "Browse Jobs",
      icon: Briefcase,
    },
    {
      href: "/tradesperson/my-responses",
      label: "My Responses",
      icon: FileText,
    },
    {
      href: "/tradesperson/messages",
      label: "Messages",
      icon: MessageSquare,
    },
    {
      href: "/tradesperson/dashboard/payouts",
      label: "Payouts",
      icon: DollarSign,
    },
  ];

  return (
    <div className="hidden border-r bg-muted/40 md:block w-64">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link
            href="/tradesperson"
            className="flex items-center gap-2 font-semibold"
          >
            <span className="">Tradesperson Dashboard</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {tradespersonLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                  { "bg-muted text-primary": pathname === href }
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="font-medium">
              {user.firstName} {user.lastName}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
