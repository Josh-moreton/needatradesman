/**
 * Middleware Pattern (The Right Way)
 * 
 * Middleware should ONLY:
 * 1. Check if auth cookie exists
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
 * - https://clerk.com/docs/references/nextjs/clerk-middleware
 */

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)', // Webhooks must be public for external services
])

export default clerkMiddleware(
    async (auth, req) => {
        // Allow public routes without any checks
        if (isPublicRoute(req)) {
            return
        }

        // Protect all other routes - Clerk handles the redirect to sign-in
        // This just checks if the auth cookie exists, nothing more
        await auth.protect()
    }
)

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}