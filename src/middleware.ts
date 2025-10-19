/**
 * Middleware Pattern (The Right Way)
 * 
 * Middleware should ONLY:
 * 1. Check if auth session exists
 * 2. Route between public and protected areas
 * 
 * Middleware should NOT:
 * ❌ Query the database (Next.js explicitly advises against this)
 * ❌ Check user roles or onboarding state
 * ❌ Read JWT claims for authorization decisions
 * 
 * Authorization checks happen in Server Components/Layouts using the auth-gate pattern.
 * 
 * References:
 * - https://nextjs.org/docs/app/building-your-application/routing/middleware
 * - https://authjs.dev/getting-started/session-management/protecting
 */

import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const isAuthenticated = !!req.auth;

  // Public routes that don't require authentication
  const publicPaths = [
    "/",
    "/signin",
    "/signup",
    "/api/auth",
    "/api/webhooks",
    "/api/stripe/webhook",
  ];

  const isPublicPath = publicPaths.some((path) =>
    nextUrl.pathname.startsWith(path)
  );

  // Allow public routes
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Redirect to signin if not authenticated
  if (!isAuthenticated) {
    const signInUrl = new URL("/signin", nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(signInUrl);
  }

  // Allow authenticated users to proceed
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};