/**
 * Test endpoint for sending email templates
 * ONLY ENABLE IN DEVELOPMENT - REMOVE FROM PRODUCTION
 * 
 * Usage:
 * POST http://localhost:3000/api/emails/test
 * {
 *   "type": "welcome",
 *   "email": "your-email@example.com"
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { emitEmailEvent, EmailEventType } from '@/lib/notifications';
import { createLogger } from '@/lib/logger';
import { JobCategory } from '@prisma/client';

const logger = createLogger('email-test-api');

// Only allow in development
if (process.env.NODE_ENV === 'production') {
    throw new Error('Test endpoint should not be available in production');
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { type, email } = body;

        if (!email) {
            return NextResponse.json(
                { error: 'Email address is required' },
                { status: 400 }
            );
        }

        logger.info({ type, email }, 'Sending test email');

        switch (type) {
            case 'welcome':
                await emitEmailEvent({
                    type: EmailEventType.USER_REGISTERED,
                    userId: 'test-user-id',
                    email,
                    firstName: 'Test User',
                    role: 'customer',
                });
                break;

            case 'job-response':
                await emitEmailEvent({
                    type: EmailEventType.JOB_RESPONDED,
                    jobId: 'test-job-id',
                    jobTitle: 'Test Plumbing Job',
                    customerEmail: email,
                    customerName: 'Test Customer',
                    tradespersonName: 'John Smith',
                    message: 'This is a test application message for your plumbing job.',
                    quote: 250,
                });
                break;

            case 'digest':
                await emitEmailEvent({
                    type: EmailEventType.JOB_DIGEST_READY,
                    userId: 'test-user-id',
                    email,
                    firstName: 'Test User',
                    jobs: [
                        {
                            id: 'job-1',
                            title: 'Kitchen Renovation',
                            category: 'CARPENTRY' as JobCategory,
                            location: 'London, SW1A 1AA',
                            budget: 5000,
                            createdAt: new Date(),
                        },
                        {
                            id: 'job-2',
                            title: 'Bathroom Plumbing',
                            category: 'PLUMBING' as JobCategory,
                            location: 'Manchester, M1 1AA',
                            budget: 800,
                            createdAt: new Date(),
                        },
                    ],
                    frequency: 'daily',
                });
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid email type. Use: welcome, job-response, or digest' },
                    { status: 400 }
                );
        }

        logger.info({ type, email }, 'Test email sent successfully');

        return NextResponse.json({
            success: true,
            message: `Test ${type} email sent to ${email}. Check your inbox (and spam folder)!`,
        });
    } catch (error) {
        logger.error({ error }, 'Error sending test email');
        return NextResponse.json(
            { error: 'Failed to send test email', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
