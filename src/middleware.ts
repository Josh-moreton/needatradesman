import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)', // Webhooks must be public for external services
])

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims } = await auth()
    const pathname = req.nextUrl.pathname

    // Allow public routes
    if (isPublicRoute(req)) {
        return NextResponse.next()
    }

    // Protect all other routes - Clerk handles redirect to sign-in
    if (!userId) {
        return NextResponse.next()
    }

    // Skip onboarding checks for API routes - let API routes handle their own auth
    if (pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    // Simple onboarding check using publicMetadata
    const isOnboarded = (sessionClaims?.publicMetadata as { onboardingComplete?: boolean })?.onboardingComplete

    // Redirect to onboarding if not completed (except if already on onboarding)
    if (!isOnboarded && !pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    // Redirect away from onboarding if already completed
    if (isOnboarded && pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
})

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}