import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function POST(request: NextRequest) {
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
        console.error('Error checking onboarding status:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
