import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Routes that require authentication
const isProtectedRoute = createRouteMatcher([
    '/dashboard(.*)',
    '/onboarding',
    '/jobs(.*)',
    '/applications(.*)',
    '/messages(.*)',
    '/api/user(.*)'
])

// Public routes that should be accessible to everyone
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/auth(.*)'
])

export default clerkMiddleware(async (auth, req) => {
    const { pathname } = req.nextUrl

    // Allow public routes without any auth checks
    if (isPublicRoute(req)) {
        return NextResponse.next()
    }

    // For protected routes, ensure user is authenticated
    if (isProtectedRoute(req)) {
        const { userId } = await auth()

        if (!userId) {
            // Redirect to sign-in for unauthenticated users
            const signInUrl = new URL('/sign-in', req.url)
            signInUrl.searchParams.set('redirect_url', pathname)
            return NextResponse.redirect(signInUrl)
        }

        // User is authenticated, continue
        return NextResponse.next()
    }

    // For all other routes, continue without auth check
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