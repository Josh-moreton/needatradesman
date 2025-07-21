import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get user from database
        const dbUser = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: { role: true }
        })

        if (!dbUser || !dbUser.role) {
            return NextResponse.json(
                { error: 'User not found or no role set' },
                { status: 404 }
            )
        }

        // Get current Clerk metadata
        const client = await clerkClient()
        const clerkUser = await client.users.getUser(userId)

        const needsUpdate = !clerkUser.publicMetadata?.onboardingComplete ||
            clerkUser.publicMetadata?.role !== dbUser.role

        if (needsUpdate) {
            // Update Clerk metadata to match database
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    onboardingComplete: true,
                    role: dbUser.role
                }
            })

            return NextResponse.json({
                success: true,
                message: 'Metadata synchronized',
                updated: true,
                role: dbUser.role
            })
        } else {
            return NextResponse.json({
                success: true,
                message: 'Metadata already in sync',
                updated: false,
                role: dbUser.role
            })
        }
    } catch (error) {
        console.error('Error synchronizing metadata:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
