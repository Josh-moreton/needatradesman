import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createLogger } from './lib/logger'

const logger = createLogger('middleware')

interface ClerkMetadata {
    onboardingComplete?: boolean;
}

// Public routes that should be accessible to everyone (including unauthenticated users)
const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/auth(.*)',
    '/onboarding(.*)',
    '/debug-onboarding(.*)'  // Add debug page to public routes
])

// Routes that should be accessible to authenticated users (skip onboarding check)
const isAuthenticatedRoute = createRouteMatcher([
    '/customer(.*)',
    '/tradesperson(.*)',
    '/dashboard(.*)'
])

// Add a bypass parameter to prevent infinite redirects
const hasBypassParam = (url: string) => {
    return url.includes('bypass_onboarding=true')
}

export default clerkMiddleware(
    async (auth, req) => {
        try {
            const pathname = req.nextUrl.pathname

            // Allow public routes without any auth checks
            if (isPublicRoute(req)) {
                return
            }

            // Skip onboarding check for API routes
            if (pathname.startsWith('/api/')) {
                return
            }

            // For authenticated routes, only check if user is signed in
            // Let the page components handle role-based logic
            if (isAuthenticatedRoute(req)) {
                const { userId } = await auth()
                if (!userId) {
                    logger.debug('No userId for authenticated route, letting Clerk handle sign-in')
                    return // Clerk will redirect to sign-in
                }
                logger.debug({ pathname }, 'Allowing authenticated route')
                return // Skip onboarding check, let pages handle it
            }

            // Temporary bypass for debugging infinite loops
            if (hasBypassParam(req.url)) {
                logger.debug('Bypassing onboarding check due to bypass parameter')
                return
            }

            // Get auth info - handle potential errors
            let authResult;
            try {
                authResult = await auth()
            } catch (authError) {
                logger.error({ error: authError }, 'Auth error in middleware')
                return // Let Clerk handle the error
            }

            const { userId, sessionClaims } = authResult

            // Always log for debugging
            logger.debug({
                userId: userId || 'NO_USER_ID',
                pathname,
                hasSessionClaims: !!sessionClaims,
                sessionClaimsKeys: sessionClaims ? Object.keys(sessionClaims) : 'NO_SESSION_CLAIMS',
                url: req.url
            }, 'Middleware check')

            // For all other routes, ensure user is authenticated
            if (!userId) {
                logger.debug('No userId, letting Clerk redirect to sign-in')
                return // This will trigger Clerk's default redirect to sign-in
            }

            // Check if user has completed onboarding
            // Try both possible locations for metadata
            const publicMetadata = sessionClaims?.publicMetadata as ClerkMetadata
            const metadata = sessionClaims?.metadata as ClerkMetadata
            let onboarded = publicMetadata?.onboardingComplete || metadata?.onboardingComplete

            logger.debug({
                publicMetadata,
                metadata,
                onboarded,
                publicMetadataKeys: publicMetadata ? Object.keys(publicMetadata) : 'NO_PUBLIC_METADATA',
                metadataKeys: metadata ? Object.keys(metadata) : 'NO_METADATA',
                hasPublicMetadataField: 'publicMetadata' in (sessionClaims || {}),
                hasMetadataField: 'metadata' in (sessionClaims || {})
            }, 'Onboarding check')

            // If session claims don't have metadata, it might be a timing issue
            // Log this case but still fetch fresh data as fallback
            if (userId && !('publicMetadata' in (sessionClaims || {}))) {
                logger.warn('Session claims missing publicMetadata field - this should be rare after session.reload() fix')
                try {
                    logger.debug('Fetching fresh data from Clerk API as fallback...')
                    const { clerkClient } = await import('@clerk/nextjs/server')
                    const client = await clerkClient()
                    const freshUser = await client.users.getUser(userId)
                    const freshOnboarded = !!freshUser.publicMetadata?.onboardingComplete

                    logger.debug({
                        userId,
                        freshPublicMetadata: freshUser.publicMetadata,
                        freshOnboarded
                    }, 'Fresh user check')

                    onboarded = freshOnboarded
                } catch (fetchError) {
                    logger.error({ error: fetchError }, 'Error fetching fresh user data')
                    // If we can't fetch fresh data, assume not onboarded for safety
                    onboarded = false
                }
            }

            if (!onboarded && !pathname.startsWith('/onboarding')) {
                logger.debug({ from: pathname }, 'Redirecting to onboarding')
                return NextResponse.redirect(new URL('/onboarding', req.url))
            }

            logger.debug({ pathname }, 'Allowing request')
            return // Allow the request to proceed
        } catch (error) {
            logger.error({ error }, 'Middleware error')
            return // Allow the request to proceed on error
        }
    },
    // Enable debug mode in development for easier troubleshooting
    { debug: process.env.NODE_ENV === 'development' }
)

export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}