import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { createLogger } from './logger'

const logger = createLogger('auth');

export async function getCurrentUser() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return null
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId }
        })

        return user
    } catch (error) {
        logger.error({ error }, 'Error getting current user')
        return null
    }
}

export async function requireAuth() {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('User not authenticated')
    }

    return user
}

export async function needsOnboarding() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return false
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId }
        })

        // User needs onboarding if they don't exist in our DB or don't have a role
        return !user || !user.role
    } catch (error) {
        logger.error({ error }, 'Error checking onboarding status')
        return true // Err on the side of requiring onboarding
    }
}

export async function isAuthenticated() {
    try {
        const { userId } = await auth()
        return !!userId
    } catch (error) {
        logger.error({ error }, 'Error checking authentication')
        return false
    }
}
