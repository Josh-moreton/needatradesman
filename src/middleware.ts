import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createLogger } from './lib/logger'

const logger = createLogger('middleware')

interface ClerkMetadata {
    onboardingComplete?: boolean;
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
        const pathname = req.nextUrl.pathname

        try {
            // 1. Allow public routes without any checks
            if (isPublicRoute(req)) {
                return
            }

            // 2. Attempt to get authentication info
            let authResult;
            try {
                authResult = await auth()
            } catch (authError) {
                logger.error({ error: authError, pathname }, 'Auth error in middleware')
                return // Let Clerk handle the error
            }

            const { userId, sessionClaims } = authResult

            // 3. Require authentication for all other routes
            if (!userId) {
                logger.debug({ pathname }, 'No userId, letting Clerk redirect to sign-in')
                return // Clerk will redirect to sign-in
            }

            // 4. Skip onboarding check for API routes (except webhooks which are public)
            if (pathname.startsWith('/api/')) {
                return
            }

            // 5. Check if user has completed onboarding
            const publicMetadata = sessionClaims?.publicMetadata as ClerkMetadata
            const metadata = sessionClaims?.metadata as ClerkMetadata
            let onboarded = publicMetadata?.onboardingComplete || metadata?.onboardingComplete

            logger.debug({
                userId,
                pathname,
                hasSessionClaims: !!sessionClaims,
                onboarded,
                hasPublicMetadataField: 'publicMetadata' in (sessionClaims || {}),
            }, 'Middleware check')

            // If session claims don't have metadata, fetch fresh data as fallback
            if (userId && !('publicMetadata' in (sessionClaims || {}))) {
                logger.warn('Session claims missing publicMetadata field - fetching fresh data')
                try {
                    const { clerkClient } = await import('@clerk/nextjs/server')
                    const client = await clerkClient()
                    const freshUser = await client.users.getUser(userId)
                    const freshOnboarded = !!freshUser.publicMetadata?.onboardingComplete

                    logger.debug({
                        userId,
                        freshOnboarded
                    }, 'Fresh user check')

                    onboarded = freshOnboarded
                } catch (fetchError) {
                    logger.error({ error: fetchError }, 'Error fetching fresh user data')
                    // If we can't fetch fresh data, assume not onboarded for safety
                    onboarded = false
                }
            }

            // 6. Handle onboarding redirects
            if (!onboarded && !isOnboardingRoute(req)) {
                logger.debug({ from: pathname }, 'Redirecting to onboarding')
                return NextResponse.redirect(new URL('/onboarding', req.url))
            }

            if (onboarded && isOnboardingRoute(req)) {
                logger.debug({ from: pathname }, 'User already onboarded, redirecting to dashboard')
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }

            logger.debug({ pathname }, 'Allowing request')
            return // Allow the request to proceed
        } catch (error) {
            logger.error({ error, pathname }, 'Middleware error')
            return // Allow the request to proceed on error
        }
    }
)

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        String.raw`/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)`,
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}