import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'

const logger = createLogger('user-onboarding-status');

export async function POST() {
    try {
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Get the user from the database
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                role: true,
                onboardingComplete: true,
            }
        })

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            onboardingComplete: user.onboardingComplete,
            role: user.role,
        })
    } catch (error) {
        logger.error({ error }, 'Error checking onboarding status')
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
