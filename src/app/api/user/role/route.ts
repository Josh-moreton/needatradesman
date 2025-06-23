import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { UserRole, JobCategory } from '@/lib/schemas'
import { z } from 'zod'

const setRoleSchema = z.object({
    role: z.nativeEnum(UserRole),
    trades: z.array(z.nativeEnum(JobCategory)).optional()
})

export async function POST(request: NextRequest) {
    try {
        // Get the authenticated user
        const { userId } = await auth()

        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Parse and validate the request body
        const body = await request.json()
        const { role, trades } = setRoleSchema.parse(body)

        // Check if user already exists in our database
        const existingUser = await prisma.user.findUnique({
            where: { clerkId: userId }
        })

        if (existingUser) {
            // Update existing user's role and trades (if provided)
            const updateData: Record<string, unknown> = { role };
            if (trades && role === UserRole.TRADESPERSON) {
                updateData.trades = trades;
            }

            const updatedUser = await prisma.user.update({
                where: { clerkId: userId },
                data: updateData
            })

            // Set onboarding complete metadata in Clerk
            const client = await clerkClient()
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    onboardingComplete: true,
                    role: role
                }
            })

            return NextResponse.json({
                success: true,
                user: updatedUser
            })
        } else {
            // Fetch user info from Clerk
            const clerkUser = await currentUser();
            if (!clerkUser) {
                return NextResponse.json({ error: 'Clerk user not found' }, { status: 404 });
            }
            const email = clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.primaryEmailAddress?.emailAddress;
            const firstName = clerkUser.firstName || null;
            const lastName = clerkUser.lastName || null;
            if (!email) {
                return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
            }
            // Create new user record
            const createData = {
                clerkId: userId,
                email,
                firstName,
                lastName,
                role,
                ...(trades && role === UserRole.TRADESPERSON ? { trades } : {})
            };

            const newUser = await prisma.user.create({
                data: createData
            })

            // Set onboarding complete metadata in Clerk
            const client = await clerkClient()
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    onboardingComplete: true,
                    role: role
                }
            })

            return NextResponse.json({
                success: true,
                user: newUser
            })
        }
    } catch (error) {
        console.error('Error setting user role:', error)

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid role provided' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
