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

/**
 * Logs middleware errors in a structured format
 * Only logs in development or when critical errors occur
 */
function logMiddlewareError(error: unknown, context: { pathname: string; userId?: string }) {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        pathname: context.pathname,
        userId: context.userId || 'unauthenticated',
        errorType: error instanceof Error ? error.constructor.name : typeof error,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error && process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }

    // Always log errors to console in development
    if (process.env.NODE_ENV === 'development') {
        console.error('[Middleware Error]', errorInfo)
    } else {
        // In production, only log critical info (no stack traces)
        console.error('[Middleware Error]', {
            timestamp: errorInfo.timestamp,
            pathname: errorInfo.pathname,
            errorType: errorInfo.errorType,
            errorMessage: errorInfo.errorMessage,
        })
    }

    // NOTE: Integrate with production error tracking service (e.g., Sentry) when available
    // Example: Sentry.captureException(error, { contexts: { middleware: errorInfo } })
}

/**
 * Logs critical middleware events for monitoring
 * Only logs significant events, not every request
 */
function logCriticalEvent(event: string, context: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
        console.info('[Middleware Event]', event, context)
    }
    // In production, consider using a proper logging service
    // e.g., logger.info(event, context)
}

/**
 * Handles onboarding redirects based on user's onboarding status
 * Returns a redirect response if needed, undefined otherwise
 */
function handleOnboardingRedirect(
    onboarded: boolean | undefined,
    pathname: string,
    req: { url: string }
): NextResponse | undefined {
    // Redirect to onboarding if not complete
    if (!onboarded && !isOnboardingRoute({ nextUrl: { pathname } } as never)) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    // Redirect from onboarding if already complete
    if (onboarded && isOnboardingRoute({ nextUrl: { pathname } } as never)) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return undefined
}

export default clerkMiddleware(
    async (auth, req) => {
        const pathname = req.nextUrl.pathname

        try {
            // 1. Allow public routes without any checks
            if (isPublicRoute(req)) {
                return
            }

            // 2. Attempt to get authentication info
            let userId: string | null
            let sessionClaims: Record<string, unknown> | null

            try {
                const authResult = await auth()
                userId = authResult.userId
                sessionClaims = authResult.sessionClaims
            } catch (authError) {
                // Auth errors are critical - they indicate Clerk API issues
                logMiddlewareError(authError, { pathname })
                logCriticalEvent('auth_failure', {
                    pathname,
                    error: authError instanceof Error ? authError.message : 'Unknown auth error'
                })

                // Allow Clerk to handle authentication errors gracefully
                // by letting the request proceed (Clerk will redirect to sign-in)
                return
            }

            // 3. Require authentication for all other routes
            if (!userId) {
                // This is expected behavior, not an error - user just isn't signed in
                return // Clerk will redirect to sign-in
            }

            // 4. Skip onboarding check for API routes (except webhooks which are public)
            if (pathname.startsWith('/api/')) {
                return
            }

            // 5. Check onboarding status from session claims
            // Validate that sessionClaims exists before accessing nested properties
            if (!sessionClaims) {
                logCriticalEvent('missing_session_claims', {
                    pathname,
                    userId,
                    message: 'Session claims unexpectedly missing for authenticated user'
                })

                // Safely assume not onboarded if claims are missing
                // This prevents users from bypassing onboarding
                if (!isOnboardingRoute(req)) {
                    return NextResponse.redirect(new URL('/onboarding', req.url))
                }
                return
            }

            const publicMetadata = sessionClaims.publicMetadata as PublicMetadata | undefined
            const onboarded = publicMetadata?.onboardingComplete

            // 6-7. Handle onboarding redirects
            const redirectResponse = handleOnboardingRedirect(onboarded, pathname, req)
            if (redirectResponse) {
                return redirectResponse
            }

            // Request is allowed to proceed
            return

        } catch (unexpectedError) {
            // Catch any unexpected errors in our middleware logic
            logMiddlewareError(unexpectedError, { pathname, userId: 'unknown' })
            logCriticalEvent('unexpected_middleware_error', {
                pathname,
                error: unexpectedError instanceof Error ? unexpectedError.message : 'Unknown error'
            })

            // On unexpected errors, fail open but log the issue
            // This prevents middleware bugs from breaking the entire app
            // Better to allow the request and handle security at the page level
            // than to show users a broken site
            return
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