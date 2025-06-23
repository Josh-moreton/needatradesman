import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

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

            // Temporary bypass for debugging infinite loops
            if (hasBypassParam(req.url)) {
                console.log('Bypassing onboarding check due to bypass parameter')
                return
            }

            // Get auth info - handle potential errors
            let authResult;
            try {
                authResult = await auth()
            } catch (authError) {
                console.error('Auth error in middleware:', authError)
                return // Let Clerk handle the error
            }

            const { userId, sessionClaims } = authResult

            // Always log for debugging
            console.log('Middleware check:', { 
                userId: userId || 'NO_USER_ID', 
                pathname, 
                hasSessionClaims: !!sessionClaims,
                sessionClaimsKeys: sessionClaims ? Object.keys(sessionClaims) : 'NO_SESSION_CLAIMS',
                url: req.url
            })

            // For all other routes, ensure user is authenticated
            if (!userId) {
                console.log('No userId, letting Clerk redirect to sign-in')
                return // This will trigger Clerk's default redirect to sign-in
            }

            // Check if user has completed onboarding
            // Try both possible locations for metadata
            const publicMetadata = sessionClaims?.publicMetadata as ClerkMetadata
            const metadata = sessionClaims?.metadata as ClerkMetadata
            let onboarded = publicMetadata?.onboardingComplete || metadata?.onboardingComplete
            
            console.log('Onboarding check:', {
                publicMetadata,
                metadata, 
                onboarded,
                publicMetadataKeys: publicMetadata ? Object.keys(publicMetadata) : 'NO_PUBLIC_METADATA',
                metadataKeys: metadata ? Object.keys(metadata) : 'NO_METADATA',
                hasPublicMetadataField: 'publicMetadata' in (sessionClaims || {}),
                hasMetadataField: 'metadata' in (sessionClaims || {})
            })
            
            // If session claims don't have metadata, it might be a timing issue
            // Log this case but still fetch fresh data as fallback
            if (userId && !('publicMetadata' in (sessionClaims || {}))) {
                console.log('WARNING: Session claims missing publicMetadata field - this should be rare after session.reload() fix')
                try {
                    console.log('Fetching fresh data from Clerk API as fallback...')
                    const { clerkClient } = await import('@clerk/nextjs/server')
                    const client = await clerkClient()
                    const freshUser = await client.users.getUser(userId)
                    const freshOnboarded = !!freshUser.publicMetadata?.onboardingComplete
                    
                    console.log('Fresh user check:', {
                        userId,
                        freshPublicMetadata: freshUser.publicMetadata,
                        freshOnboarded
                    })
                    
                    onboarded = freshOnboarded
                } catch (fetchError) {
                    console.error('Error fetching fresh user data:', fetchError)
                    // If we can't fetch fresh data, assume not onboarded for safety
                    onboarded = false
                }
            }
            
            if (!onboarded && !pathname.startsWith('/onboarding')) {
                console.log('Redirecting to onboarding from:', pathname)
                return NextResponse.redirect(new URL('/onboarding', req.url))
            }

            console.log('Allowing request to:', pathname)
            return // Allow the request to proceed
        } catch (error) {
            console.error('Middleware error:', error)
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