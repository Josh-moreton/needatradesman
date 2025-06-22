import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

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
        console.error('Error getting current user:', error)
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

export async function requireRole(allowedRoles: UserRole[]) {
    const user = await requireAuth()

    if (!allowedRoles.includes(user.role)) {
        throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
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
        console.error('Error checking onboarding status:', error)
        return true // Err on the side of requiring onboarding
    }
}

export async function isAuthenticated() {
    try {
        const { userId } = await auth()
        return !!userId
    } catch (error) {
        console.error('Error checking authentication:', error)
        return false
    }
}
