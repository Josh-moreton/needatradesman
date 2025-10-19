import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('user-me-api');

/**
 * GET /api/user/me
 * Returns the current authenticated user's data from our database
 */
export async function GET() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
            select: {
                id: true,
                clerkId: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                trades: true,
                stripeAccountId: true,
                createdAt: true,
                updatedAt: true,
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in database' },
                { status: 404 }
            )
        }

        return NextResponse.json(user)
    } catch (error) {
        logger.error({ error }, 'Error fetching current user');

        return NextResponse.json(
            {
                error: 'Internal server error',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        )
    }
}
