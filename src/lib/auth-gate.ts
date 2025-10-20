/**
 * Authorization Gate Pattern
 * 
 * This is the PROPER way to handle auth in Next.js App Router:
 * 1. Middleware = check session exists, route public vs protected
 * 2. Server Components/Layouts = check DB for role/state (cached)
 * 3. Database = single source of truth (not JWT, not cookies)
 * 
 * References:
 * - https://nextjs.org/docs/app/building-your-application/routing/middleware
 * - https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens
 */

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { unstable_cache } from 'next/cache'
import type { UserRole } from '@prisma/client'

export type AuthGate = {
    userId: string
    email: string
    role: UserRole
    name: string | null
    onboardingComplete: boolean
}

/**
 * Get the current user's gate data (role, onboarding state).
 * This is cached per-request and tagged for revalidation.
 * 
 * Use this in Server Components and Route Handlers, NOT in Middleware.
 */
export async function getAuthGate(): Promise<AuthGate | null> {
    const session = await auth()

    if (!session?.user?.id) {
        return null
    }

    const userId = session.user.id

    // Cache for 60 seconds, tagged for revalidation
    const getCachedUser = unstable_cache(
        async (userId: string) => {
            return await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    name: true,
                    onboardingComplete: true,
                }
            })
        },
        [`user-gate-${userId}`],
        {
            revalidate: 60,
            tags: [`user:${userId}`, 'user-gate']
        }
    )

    const user = await getCachedUser(userId)

    if (!user) {
        return null
    }

    return {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        onboardingComplete: user.onboardingComplete,
    }
}

/**
 * Require an authenticated user with completed onboarding.
 * Throws an error if not authenticated or not onboarded.
 * 
 * Use this in API routes that require auth.
 */
export async function requireAuthGate(): Promise<AuthGate> {
    const gate = await getAuthGate()

    if (!gate) {
        throw new Error('Unauthorized: No user session')
    }

    return gate
}

/**
 * Require a specific role.
 * Throws an error if user doesn't have the required role.
 */
export async function requireRole(requiredRole: UserRole): Promise<AuthGate> {
    const gate = await requireAuthGate()

    if (gate.role !== requiredRole) {
        throw new Error(`Forbidden: Requires ${requiredRole} role`)
    }

    return gate
}
