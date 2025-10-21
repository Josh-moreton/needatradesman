/**
 * Email unsubscribe endpoint
 * Handles one-click unsubscribe from digest emails
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { updateEmailPreferences } from '@/lib/notifications/preferences';
import { createLogger } from '@/lib/logger';

const logger = createLogger('email-unsubscribe-api');

/**
 * GET /api/emails/unsubscribe?userId=xxx&type=digest
 * Unsubscribe user from specified email type
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (!userId) {
      return new NextResponse('Missing userId parameter', { status: 400 });
    }

    if (!type || type !== 'digest') {
      return new NextResponse('Invalid or missing type parameter', { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Update preferences to disable digest emails
    await updateEmailPreferences(userId, {
      allowDigest: false,
      digestFrequency: 'NEVER',
    });

    logger.info({ userId, type }, 'User unsubscribed from emails');

    // Return a simple HTML page confirming unsubscribe
    return new NextResponse(
      `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Unsubscribed - Need a Tradesman</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              text-align: center;
            }
            h1 { color: #1a202c; }
            p { color: #666; line-height: 1.6; }
            a { color: #3b82f6; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <h1>✓ You've been unsubscribed</h1>
          <p>You will no longer receive job digest emails from Need a Tradesman.</p>
          <p>You will still receive important transactional emails about your account and jobs.</p>
          <p><a href="/dashboard/settings/email">Manage your email preferences</a></p>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'Content-Type': 'text/html',
        },
      }
    );
  } catch (error) {
    logger.error({ error }, 'Error unsubscribing user');
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * POST /api/emails/unsubscribe
 * One-click unsubscribe (List-Unsubscribe-Post header support)
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');

    if (!userId || !type) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Update preferences
    if (type === 'digest') {
      await updateEmailPreferences(userId, {
        allowDigest: false,
        digestFrequency: 'NEVER',
      });
    }

    logger.info({ userId, type }, 'User unsubscribed via POST');

    return new NextResponse('Unsubscribed successfully', { status: 200 });
  } catch (error) {
    logger.error({ error }, 'Error processing unsubscribe POST');
    return new NextResponse('Internal server error', { status: 500 });
  }
}
