"use client";

import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
  Menu,
  Home,
  PlusCircle,
  FileText,
  MessageSquare,
  HelpCircle,
  Briefcase,
  BarChart3,
  DollarSign,
} from "lucide-react";
import { UserRole } from "@prisma/client";

export default function Header() {
  const pathname = usePathname();
  const { user: clerkUser, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch user role from our database
  useEffect(() => {
    if (isLoaded && clerkUser) {
      fetch("/api/user/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.role) {
            setUserRole(data.role);
          }
        })
        .catch((error) => {
          console.error("Error fetching user role:", error);
        });
    }
  }, [isLoaded, clerkUser]);

  const isCustomer = userRole === UserRole.CUSTOMER;
  const isTradesperson = userRole === UserRole.TRADESPERSON;

  // Navigation links for customers
  const customerLinks = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/dashboard/jobs/new", label: "Post Job", icon: PlusCircle },
    { href: "/dashboard/my-jobs", label: "My Jobs", icon: FileText },
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/support", label: "Support", icon: HelpCircle },
  ];

  // Navigation links for tradespeople
  const tradespersonLinks = [
    { href: "/dashboard", label: "Home", icon: Home },
    { href: "/dashboard/jobs", label: "Browse Jobs", icon: Briefcase },
    { href: "/dashboard/my-responses", label: "My Responses", icon: FileText },
    { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
    { href: "/dashboard/quote-templates", label: "Quote Templates", icon: BarChart3 },
    { href: "/dashboard/payouts", label: "Payouts", icon: DollarSign },
    { href: "/dashboard/support", label: "Support", icon: HelpCircle },
  ];

  const currentLinks = isCustomer ? customerLinks : isTradesperson ? tradespersonLinks : [];

  // Mobile menu component
  const MobileMenu = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="text-left">
            {isCustomer ? "Customer" : isTradesperson ? "Tradesperson" : "Menu"}
          </SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col p-4">
          {currentLinks.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === href && "bg-accent text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      {/* This div creates the centered, max-width container with padding */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* This div contains the flex layout for the header items */}
        <div className="relative flex h-14 items-center justify-between">
          {/* Left Section: Mobile Menu + Logo */}
          <div className="flex items-center gap-2">
            <SignedIn>
              <MobileMenu />
            </SignedIn>
            <Link href="/" className="flex items-center space-x-2">
              <div className="hidden md:flex">
                <Logo variant="auto" size="md" priority />
              </div>
              <div className="flex md:hidden">
                <Logo variant="auto" size="sm" priority />
              </div>
            </Link>
          </div>

          {/* Center Section: Navigation */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                <SignedIn>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger>Jobs</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        <li className="row-span-3">
                          <NavigationMenuLink asChild>
                            <Link
                              className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md"
                              href={
                                isTradesperson
                                  ? "/dashboard/jobs"
                                  : "/dashboard/jobs/new"
                              }
                            >
                              <div className="mb-2 mt-4 text-lg font-medium">
                                {isTradesperson ? "Browse Jobs" : "Post a Job"}
                              </div>
                              <p className="text-sm leading-tight text-muted-foreground">
                                {isTradesperson
                                  ? "Find work opportunities in your area and apply to jobs that match your skills."
                                  : "Create a new job posting to find skilled tradespeople."}
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        {isCustomer ? (
                          <>
                            <ListItem
                              href="/dashboard/jobs/new"
                              title="Post a Job"
                            >
                              Create a new job posting to find skilled
                              tradespeople.
                            </ListItem>
                            <ListItem
                              href="/dashboard/my-jobs"
                              title="My Jobs"
                            >
                              Manage your posted jobs and view applications.
                            </ListItem>
                            <ListItem
                              href="/dashboard/messages"
                              title="Messages"
                            >
                              Communicate with tradespeople.
                            </ListItem>
                          </>
                        ) : isTradesperson ? (
                          <>
                            <ListItem
                              href="/dashboard/jobs"
                              title="Browse Jobs"
                            >
                              Find work opportunities in your area.
                            </ListItem>
                            <ListItem
                              href="/dashboard/my-responses"
                              title="My Responses"
                            >
                              Track your job applications and responses.
                            </ListItem>
                            <ListItem
                              href="/dashboard/messages"
                              title="Messages"
                            >
                              Communicate with customers.
                            </ListItem>
                          </>
                        ) : (
                          <>
                            <ListItem href="/sign-up" title="Post a Job">
                              Sign up as a customer to post jobs.
                            </ListItem>
                            <ListItem href="/sign-up" title="Find Work">
                              Sign up as a tradesperson to find work.
                            </ListItem>
                            <ListItem href="/sign-in" title="Sign In">
                              Access your account.
                            </ListItem>
                          </>
                        )}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href={
                          isCustomer
                            ? "/customer"
                            : isTradesperson
                            ? "/tradesperson"
                            : "/"
                        }
                        className={cn(
                          "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                          ((isCustomer && pathname === "/customer") ||
                            (isTradesperson && pathname === "/tradesperson")) &&
                            "bg-accent text-accent-foreground"
                        )}
                      >
                        Dashboard
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href={
                          isCustomer
                            ? "/dashboard/messages"
                            : isTradesperson
                            ? "/dashboard/messages"
                            : "/"
                        }
                        className={cn(
                          "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                          ((isCustomer &&
                            pathname?.startsWith("/dashboard/messages")) ||
                            (isTradesperson &&
                              pathname?.startsWith(
                                "/dashboard/messages"
                              ))) &&
                            "bg-accent text-accent-foreground"
                        )}
                      >
                        Messages
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                </SignedIn>
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Right Section: Auth buttons and theme toggle */}
          <div className="flex items-center">
            <nav className="flex items-center space-x-2">
              {mounted && <ThemeToggle />}
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm">Get Started</Button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
              </SignedIn>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

const ListItem = ({
  className,
  title,
  children,
  href,
}: {
  className?: string;
  title: string;
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
};
