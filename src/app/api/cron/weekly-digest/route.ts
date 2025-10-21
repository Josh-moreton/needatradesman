/**
 * Weekly digest cron job
 * Runs every Monday at 07:00 UTC (configured via vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getUsersForDigest, getJobsForDigest } from '@/lib/notifications/digest';
import { emitEmailEvent, EmailEventType } from '@/lib/notifications';

const logger = createLogger('weekly-digest-cron');

export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron (check Authorization header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      logger.error('Unauthorized cron request');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    logger.info('Starting weekly digest job');

    const users = await getUsersForDigest('WEEKLY');
    logger.info({ count: users.length }, 'Found users for weekly digest');

    let sentCount = 0;
    let skippedCount = 0;

    for (const preference of users) {
      try {
        const jobs = await getJobsForDigest(preference.userId, 'WEEKLY', 15);

        // Skip if no jobs found
        if (jobs.length === 0) {
          skippedCount++;
          continue;
        }

        // Emit digest email event
        await emitEmailEvent({
          type: EmailEventType.JOB_DIGEST_READY,
          userId: preference.user.id,
          email: preference.user.email,
          firstName: preference.user.firstName || 'there',
          jobs: jobs,
          frequency: 'weekly',
        });

        sentCount++;
        logger.debug({ userId: preference.userId, jobCount: jobs.length }, 'Sent weekly digest');
      } catch (error) {
        logger.error(
          { error, userId: preference.userId },
          'Error sending weekly digest to user'
        );
        // Continue with other users even if one fails
      }
    }

    logger.info({ sentCount, skippedCount }, 'Weekly digest job completed');

    return NextResponse.json({
      success: true,
      sent: sentCount,
      skipped: skippedCount,
      total: users.length,
    });
  } catch (error) {
    logger.error({ error }, 'Error in weekly digest cron job');
    return new NextResponse('Internal server error', { status: 500 });
  }
}
