import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { UserRole, JobCategory } from '@/lib/schemas'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { revalidateTag, revalidatePath } from 'next/cache'

const logger = createLogger('user-role-api');

const setRoleSchema = z.object({
    role: z.nativeEnum(UserRole),
    trades: z.array(z.nativeEnum(JobCategory)).optional()
})

export async function POST(request: NextRequest) {
    try {
        // Get the authenticated user
        const session = await auth()

        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const userId = session.user.id

        // Parse and validate the request body
        const body = await request.json()
        const { role, trades } = setRoleSchema.parse(body)

        // Update user's role and trades, and mark onboarding as complete
        const updateData: Record<string, unknown> = {
            role,
            onboardingComplete: true
        };

        if (trades && role === UserRole.TRADESPERSON) {
            updateData.trades = trades;
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        // Invalidate caches so the layout picks up the new user immediately
        revalidateTag(`user:${userId}`)
        revalidateTag('user-gate')
        revalidatePath('/', 'layout') // Force root layout to refetch

        return NextResponse.json({
            success: true,
            user: updatedUser
        });
    } catch (error) {
        logger.error({ error }, 'Error setting user role');

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid role provided', details: error.errors },
                { status: 400 }
            );
        }

        // TEMP: Always show detailed error (even in production)
        return NextResponse.json(
            { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
