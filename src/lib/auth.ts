import { auth } from '@/auth'
import { prisma } from './prisma'
import { createLogger } from './logger'

const logger = createLogger('auth');

/**
 * Get the current authenticated user from the database.
 * Returns null if not authenticated or user not found.
 */
export async function getCurrentUser() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return null
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                role: true,
                onboardingComplete: true,
                stripeAccountId: true,
                trades: true,
                createdAt: true,
                updatedAt: true,
            }
        })

        return user
    } catch (error) {
        logger.error({ error }, 'Error getting current user')
        return null
    }
}

/**
 * Require authentication. Throws an error if user is not authenticated.
 */
export async function requireAuth() {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    return user
}

/**
 * Check if the current user needs to complete onboarding.
 * Returns true if user has PENDING role or onboardingComplete is false.
 */
export async function needsOnboarding() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return false
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                role: true,
                onboardingComplete: true,
            }
        })

        // User needs onboarding if they have PENDING role or haven't completed onboarding
        return user?.role === 'PENDING' || !user?.onboardingComplete
    } catch (error) {
        logger.error({ error }, 'Error checking onboarding status')
        return true // Err on the side of requiring onboarding
    }
}

/**
 * Check if the current request has an authenticated session.
 */
export async function isAuthenticated() {
    try {
        const session = await auth()
        return !!session?.user?.id
    } catch (error) {
        logger.error({ error }, 'Error checking authentication')
        return false
    }
}
