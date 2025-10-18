import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Debug endpoint to inspect session claims
 * Visit: /api/debug-session
 */
export async function GET() {
    const { userId, sessionClaims } = await auth()

    return NextResponse.json({
        userId,
        sessionClaims,
        publicMetadata: sessionClaims?.publicMetadata,
        metadata: sessionClaims?.metadata,
        // Show all claim keys
        claimKeys: sessionClaims ? Object.keys(sessionClaims) : [],
    }, { status: 200 })
}
