import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendWelcomeEmail } from '@/lib/emails/send';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/emails/welcome
 * Send a welcome email to the current user
 * 
 * This is an example endpoint showing how to use the email functionality.
 * In production, you might want to call this from your onboarding flow.
 */
export async function POST() {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { clerkId: userId },
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!user.email || !user.firstName) {
            return NextResponse.json({ error: 'User email or name not found' }, { status: 400 });
        }

        // Determine user role
        const userRole = user.role === 'TRADESPERSON' ? 'tradesperson' : 'customer';

        // Send welcome email
        const result = await sendWelcomeEmail({
            userEmail: user.email,
            userName: user.firstName,
            userRole,
        });

        if (!result.success) {
            return NextResponse.json({ error: 'Failed to send email', details: result.error }, { status: 500 });
        }

        return NextResponse.json({ message: 'Welcome email sent successfully' });
    } catch (error) {
        console.error('Error in welcome email endpoint:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
