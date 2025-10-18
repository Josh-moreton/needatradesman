"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const customerLinks = [
    { href: "/dashboard/jobs/new", label: "Post Job" },
    { href: "/dashboard/my-jobs", label: "My Jobs" },
    { href: "/dashboard/messages", label: "Messages" },
  ];

  const tradespersonLinks = [
    { href: "/dashboard/jobs", label: "Browse Jobs" },
    { href: "/dashboard/my-responses", label: "My Responses" },
    { href: "/dashboard/messages", label: "Messages" },
    { href: "/dashboard/quote-templates", label: "Quote Templates" },
    { href: "/dashboard/payouts", label: "Payouts" },
  ];

  const links =
    userRole === UserRole.CUSTOMER ? customerLinks : tradespersonLinks;

  return (
    <div className="hidden border-r bg-sidebar border-sidebar md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="">My Dashboard</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {links.map(({ href, label }) => (
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
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
