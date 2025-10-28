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

// Helper function to update Clerk metadata
async function updateClerkMetadata(userId: string, role: UserRole) {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
        publicMetadata: {
            onboardingComplete: true,
            role: role
        }
    });
}

// Helper function to invalidate caches
function invalidateUserCaches(userId: string) {
    revalidateTag(`user:${userId}`)
    revalidateTag('user-gate')
}

// Helper function to send welcome email
async function sendWelcomeEmail(userId: string, email: string, firstName: string | null, role: UserRole) {
    try {
        await emitEmailEvent({
            type: EmailEventType.USER_REGISTERED,
            userId: userId,
            email: email,
            firstName: firstName || 'there',
            role: role === UserRole.CUSTOMER ? 'customer' : 'tradesperson',
        });
    } catch (error) {
        logger.error({ error }, 'Failed to send welcome email');
    }
}

// Helper function to handle existing user update
async function handleExistingUserUpdate(
    existingUser: { id: string; email: string; firstName: string | null; role: UserRole },
    userId: string,
    role: UserRole,
    trades?: JobCategory[]
) {
    const updateData: Record<string, unknown> = { role };
    if (trades && role === UserRole.TRADESPERSON) {
        updateData.trades = trades;
    }

    const updatedUser = await prisma.user.update({
        where: { clerkId: userId },
        data: updateData
    });

    await updateClerkMetadata(userId, role);
    invalidateUserCaches(userId);

    // Send welcome email for new users (only if role is being set for first time from PENDING)
    if (existingUser.role === UserRole.PENDING && role !== UserRole.PENDING) {
        await sendWelcomeEmail(existingUser.id, existingUser.email, existingUser.firstName, role);
    }

    return updatedUser;
}

// Helper function to create or update user by email
async function createOrUpdateUserByEmail(
    email: string,
    userId: string,
    firstName: string | null,
    lastName: string | null,
    role: UserRole,
    trades?: JobCategory[]
) {
    const userByEmail = await prisma.user.findUnique({ where: { email } });
    
    if (userByEmail) {
        // Update existing user with new clerkId
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

        await updateClerkMetadata(userId, role);
        invalidateUserCaches(userId);

        return updatedUser;
    }

    // Create new user
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

    await updateClerkMetadata(userId, role);
    invalidateUserCaches(userId);
    await sendWelcomeEmail(newUser.id, newUser.email, newUser.firstName, role);

    return newUser;
}

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

        let user;

        if (existingUser) {
            // Update existing user's role and trades
            user = await handleExistingUserUpdate(existingUser, userId, role, trades);
        } else {
            // Fetch user info from Clerk
            const clerkUser = await currentUser();
            if (!clerkUser) {
                return NextResponse.json({ error: 'Clerk user not found' }, { status: 404 });
            }
            
            const email = clerkUser.emailAddresses?.[0]?.emailAddress || clerkUser.primaryEmailAddress?.emailAddress;
            if (!email) {
                return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
            }
            
            const firstName = clerkUser.firstName || null;
            const lastName = clerkUser.lastName || null;
            
            // Create or update user by email
            user = await createOrUpdateUserByEmail(email, userId, firstName, lastName, role, trades);
        }

        return NextResponse.json({
            success: true,
            user: user
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
