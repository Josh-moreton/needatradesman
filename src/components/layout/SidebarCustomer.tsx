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
      href: "/customer",
      label: "Home",
      icon: Home,
    },
    {
      href: "/customer/jobs/new",
      label: "Post Job",
      icon: PlusCircle,
    },
    {
      href: "/customer/jobs/my-jobs",
      label: "My Jobs",
      icon: FileText,
    },
    {
      href: "/customer/messages",
      label: "Messages",
      icon: MessageSquare,
    },
  ];

  return (
    <div className="hidden border-r bg-muted/40 md:block w-64">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link
            href="/customer"
            className="flex items-center gap-2 font-semibold"
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
