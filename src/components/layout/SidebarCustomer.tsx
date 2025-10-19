"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { User } from "@prisma/client";
import { PlusCircle, FileText, MessageSquare, Home, HelpCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

interface SidebarCustomerProps {
  user: User;
}

export function SidebarCustomer({ user }: SidebarCustomerProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
    {
      href: "/dashboard/support",
      label: "Support",
      icon: HelpCircle,
    },
  ];

  const NavigationLinks = () => (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {customerLinks.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
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
  );

  const UserInfo = () => (
    <div className="flex items-center gap-2 text-sm text-sidebar-foreground">
      <div className="font-medium">
        {user.firstName} {user.lastName}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex h-14 items-center border-b bg-sidebar border-sidebar-border px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="mr-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="border-b border-sidebar-border px-4 py-3">
              <SheetTitle className="text-left">Customer Dashboard</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col h-full">
              <div className="flex-1 py-4">
                <NavigationLinks />
              </div>
              <div className="mt-auto p-4 border-t border-sidebar-border">
                <UserInfo />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
          <span>Customer Dashboard</span>
        </Link>
      </div>

      {/* Desktop Sidebar */}
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
            <NavigationLinks />
          </div>
          <div className="mt-auto p-4">
            <UserInfo />
          </div>
        </div>
      </div>
    </>
  );
}
