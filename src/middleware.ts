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
    '/onboarding(.*)'
])

// Add a bypass parameter to prevent infinite redirects
const hasBypassParam = (url: string) => {
    return url.includes('bypass_onboarding=true')
}

export default clerkMiddleware(
    async (auth, req) => {
        try {
            const { userId, sessionClaims } = await auth()
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

            // For all other routes, ensure user is authenticated
            if (!userId) {
                return // This will trigger Clerk's default redirect to sign-in
            }

            // Check if user has completed onboarding
            // Try both possible locations for metadata
            const publicMetadata = sessionClaims?.publicMetadata as ClerkMetadata
            const metadata = sessionClaims?.metadata as ClerkMetadata
            const onboarded = publicMetadata?.onboardingComplete || metadata?.onboardingComplete
            
            // Always log in production for debugging redirect loops
            console.log('Middleware check:', { 
                userId, 
                pathname, 
                onboarded, 
                publicMetadata,
                metadata,
                hasSessionClaims: !!sessionClaims,
                url: req.url
            })
            
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