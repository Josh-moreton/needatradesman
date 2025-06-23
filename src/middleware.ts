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

export default clerkMiddleware(
    async (auth, req) => {
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

        // For all other routes, ensure user is authenticated
        if (!userId) {
            return // This will trigger Clerk's default redirect to sign-in
        }

        // Check if user has completed onboarding
        // In Clerk, publicMetadata is available via sessionClaims
        const publicMetadata = sessionClaims?.publicMetadata as ClerkMetadata
        const onboarded = publicMetadata?.onboardingComplete
        
        // Debug logging in development
        if (process.env.NODE_ENV === 'development') {
            console.log('Middleware check:', { 
                userId, 
                pathname, 
                onboarded, 
                publicMetadata,
                allSessionClaims: sessionClaims
            })
        }
        
        if (!onboarded && !pathname.startsWith('/onboarding')) {
            return NextResponse.redirect(new URL('/onboarding', req.url))
        }

        return // Allow the request to proceed
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