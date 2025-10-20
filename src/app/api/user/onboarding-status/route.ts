import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createLogger } from '@/lib/logger'

const logger = createLogger('user-onboarding-status');

export async function POST() {
    try {
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const client = await clerkClient()

        // Force refresh the user's metadata
        const user = await client.users.getUser(userId)

        return NextResponse.json({
            success: true,
            metadata: user.publicMetadata,
            onboardingComplete: user.publicMetadata?.onboardingComplete || false
        })
    } catch (error) {
        logger.error({ error }, 'Error checking onboarding status')
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
