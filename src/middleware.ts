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
            // Try both possible locations for metadata and also fetch fresh user data
            const publicMetadata = sessionClaims?.publicMetadata as ClerkMetadata
            const metadata = sessionClaims?.metadata as ClerkMetadata
            let onboarded = publicMetadata?.onboardingComplete || metadata?.onboardingComplete
            
            console.log('Onboarding check:', {
                publicMetadata,
                metadata, 
                onboarded,
                publicMetadataKeys: publicMetadata ? Object.keys(publicMetadata) : 'NO_PUBLIC_METADATA',
                metadataKeys: metadata ? Object.keys(metadata) : 'NO_METADATA',
                allSessionClaims: sessionClaims
            })
            
            // If we don't have onboarding data in session claims, try to fetch fresh data
            if (!onboarded && userId) {
                try {
                    console.log('Session claims missing onboarding data, checking with Clerk API...')
                    const { clerkClient } = await import('@clerk/nextjs/server')
                    const client = await clerkClient()
                    const freshUser = await client.users.getUser(userId)
                    const freshOnboarded = freshUser.publicMetadata?.onboardingComplete
                    
                    console.log('Fresh user check:', {
                        userId,
                        freshPublicMetadata: freshUser.publicMetadata,
                        freshOnboarded
                    })
                    
                    if (freshOnboarded) {
                        console.log('Found onboarding complete in fresh data, allowing request')
                        onboarded = true
                    }
                } catch (fetchError) {
                    console.error('Error fetching fresh user data:', fetchError)
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