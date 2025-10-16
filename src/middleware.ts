import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

interface PublicMetadata {
    onboardingComplete?: boolean
}

// Public routes accessible to everyone (including unauthenticated users)
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)', // Webhooks must be public for external services
])

// Onboarding routes
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)'])

export default clerkMiddleware(
    async (auth, req) => {
        const { userId, sessionClaims } = await auth()
        const pathname = req.nextUrl.pathname

        // 1. Allow public routes without any checks
        if (isPublicRoute(req)) {
            return
        }

        // 2. Require authentication for all other routes
        if (!userId) {
            return // Clerk will redirect to sign-in
        }

        // 3. Skip onboarding check for API routes (except webhooks which are public)
        if (pathname.startsWith('/api/')) {
            return
        }

        // 4. Check onboarding status from session claims
        const publicMetadata = sessionClaims?.publicMetadata as PublicMetadata | undefined
        const onboarded = publicMetadata?.onboardingComplete

        // 5. Redirect to onboarding if not complete
        if (!onboarded && !isOnboardingRoute(req)) {
            return NextResponse.redirect(new URL('/onboarding', req.url))
        }

        // 6. Redirect from onboarding if already complete
        if (onboarded && isOnboardingRoute(req)) {
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }
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