"use client";

import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function Footer() {
  return (
    <footer className="border-t bg-card/95 backdrop-blur">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="inline-block mb-4">
              <Logo variant="auto" size="md" />
            </Link>
            <p className="text-sm text-muted-foreground max-w-md">
              Connect with trusted, verified tradespeople in your area. Post
              jobs, get competitive quotes, and hire with complete confidence.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 sm:mb-4">Quick Links</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link
                  href="/sign-up"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Post a Job
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Find Work
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-in"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-foreground mb-3 sm:mb-4">Support</h3>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Help Center
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t mt-6 pt-6 sm:mt-8 sm:pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Need A Tradesman. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
