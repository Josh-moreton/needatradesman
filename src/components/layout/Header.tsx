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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function Header() {
  const pathname = usePathname();
  // Theme hydration fix: Only show ThemeToggle after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* This div creates the centered, max-width container with padding */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* This div contains the flex layout for the header items */}
        <div className="relative flex h-14 items-center justify-between">
          {/* Left Section: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="hidden items-center md:flex">
                <span className="text-xl font-bold">NeedA</span>
                <Badge variant="default" className="ml-1 text-xs">
                  Tradesman
                </Badge>
              </div>
              <div className="flex items-center md:hidden">
                <span className="font-bold">NAT</span>
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
                              href="/jobs"
                            >
                              <div className="mb-2 mt-4 text-lg font-medium">
                                Browse Jobs
                              </div>
                              <p className="text-sm leading-tight text-muted-foreground">
                                Find work opportunities in your area and apply
                                to jobs that match your skills.
                              </p>
                            </Link>
                          </NavigationMenuLink>
                        </li>
                        <ListItem href="/jobs/new" title="Post a Job">
                          Create a new job posting to find skilled tradespeople.
                        </ListItem>
                        <ListItem href="/jobs/my-jobs" title="My Jobs">
                          Manage your posted jobs and view applications.
                        </ListItem>
                        <ListItem href="/applications" title="Applications">
                          Track your job applications and responses.
                        </ListItem>
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>

                  <NavigationMenuItem>
                    <NavigationMenuLink asChild>
                      <Link
                        href="/dashboard"
                        className={cn(
                          "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                          pathname === "/dashboard" &&
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
                        href="/messages"
                        className={cn(
                          "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50",
                          pathname === "/messages" &&
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
                  afterSignOutUrl="/"
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
