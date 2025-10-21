import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { UserRole, JobCategory } from '@/lib/schemas'
import { z } from 'zod'
import { createLogger } from '@/lib/logger'
import { revalidateTag } from 'next/cache'
import { emitEmailEvent, EmailEventType } from '@/lib/notifications'

const logger = createLogger('user-role-api');

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
            });

            // Set onboarding complete metadata in Clerk
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    onboardingComplete: true,
                    role: role
                }
            });

            // Invalidate the auth gate cache so the layout picks up the new user immediately
            revalidateTag(`user:${userId}`)
            revalidateTag('user-gate')

            // Send welcome email for new users (only if role is being set for first time from PENDING)
            if (existingUser.role === UserRole.PENDING && role !== UserRole.PENDING) {
                emitEmailEvent({
                    type: EmailEventType.USER_REGISTERED,
                    userId: existingUser.id,
                    email: existingUser.email,
                    firstName: existingUser.firstName || 'there',
                    role: role === UserRole.CUSTOMER ? 'customer' : 'tradesperson',
                }).catch((error) => {
                    logger.error({ error }, 'Failed to send welcome email');
                });
            }

            return NextResponse.json({
                success: true,
                user: updatedUser
            });
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
            // Check if a user with this email already exists (unique constraint)
            const userByEmail = await prisma.user.findUnique({ where: { email } });
            if (userByEmail) {
                // Update the user with the new clerkId and other info
                const updatedUser = await prisma.user.update({
                    where: { email },
                    data: {
                        clerkId: userId,
                        firstName,
                        lastName,
                        role,
                        ...(trades && role === UserRole.TRADESPERSON ? { trades } : {})
                    }
                });

                // Set onboarding complete metadata in Clerk
                const client = await clerkClient();
                await client.users.updateUserMetadata(userId, {
                    publicMetadata: {
                        onboardingComplete: true,
                        role: role
                    }
                });

                // Invalidate the auth gate cache so the layout picks up the new user immediately
                revalidateTag(`user:${userId}`)
                revalidateTag('user-gate')

                return NextResponse.json({
                    success: true,
                    user: updatedUser
                });
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
            });

            // Set onboarding complete metadata in Clerk
            const client = await clerkClient();
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    onboardingComplete: true,
                    role: role
                }
            });

            // Invalidate the auth gate cache so the layout picks up the new user immediately
            revalidateTag(`user:${userId}`)
            revalidateTag('user-gate')

            // Send welcome email for new users completing onboarding
            emitEmailEvent({
                type: EmailEventType.USER_REGISTERED,
                userId: newUser.id,
                email: newUser.email,
                firstName: newUser.firstName || 'there',
                role: role === UserRole.CUSTOMER ? 'customer' : 'tradesperson',
            }).catch((error) => {
                logger.error({ error }, 'Failed to send welcome email');
            });

            return NextResponse.json({
                success: true,
                user: newUser
            });
        }
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
