/**
 * Email preferences management API
 * Allows users to manage their email notification preferences
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { getUserEmailPreferences, updateEmailPreferences } from '@/lib/notifications/preferences';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { JobCategory } from '@prisma/client';

const logger = createLogger('email-preferences-api');

const updatePreferencesSchema = z.object({
  allowDigest: z.boolean().optional(),
  digestFrequency: z.enum(['DAILY', 'WEEKLY', 'NEVER']).optional(),
  professionFilters: z.array(z.string()).optional(),
  regionFilters: z.array(z.string()).optional(),
});

/**
 * GET /api/emails/preferences
 * Get current user's email preferences
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const preferences = await getUserEmailPreferences(user.id);

    return NextResponse.json(preferences);
  } catch (error) {
    logger.error({ error }, 'Error fetching email preferences');
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * PUT /api/emails/preferences
 * Update current user's email preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    const body = await request.json();
    const data = updatePreferencesSchema.parse(body);

    // Convert profession filters to JobCategory enum if provided
    const professionFilters = data.professionFilters?.map((p) => {
      const upperCase = p.toUpperCase();
      const validCategories = Object.values(JobCategory) as string[];
      if (!validCategories.includes(upperCase)) {
        throw new Error(`Invalid profession: ${p}`);
      }
      return upperCase;
    });

    const preferences = await updateEmailPreferences(user.id, {
      allowDigest: data.allowDigest,
      digestFrequency: data.digestFrequency,
      professionFilters: professionFilters as unknown as import('@prisma/client').JobCategory[],
      regionFilters: data.regionFilters,
    });

    logger.info({ userId: user.id, preferences }, 'Email preferences updated');

    return NextResponse.json(preferences);
  } catch (error) {
    logger.error({ error }, 'Error updating email preferences');

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Invalid profession')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return new NextResponse('Internal server error', { status: 500 });
  }
}
