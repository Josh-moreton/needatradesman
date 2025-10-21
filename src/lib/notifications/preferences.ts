/**
 * Email preference service
 * Manages user preferences for transactional and digest emails
 */

import { prisma } from '@/lib/prisma';
import { DigestFrequency, JobCategory } from '@prisma/client';

export interface EmailPreferenceData {
  allowTransactional: boolean;
  allowDigest: boolean;
  digestFrequency: DigestFrequency;
  professionFilters?: JobCategory[];
  regionFilters?: string[];
}

/**
 * Get user email preferences (creates default if not exists)
 */
export async function getUserEmailPreferences(userId: string) {
  let preferences = await prisma.emailPreference.findUnique({
    where: { userId },
  });

  // Create default preferences if they don't exist
  if (!preferences) {
    preferences = await prisma.emailPreference.create({
      data: {
        userId,
        allowTransactional: true, // Always true, can't be disabled
        allowDigest: true,
        digestFrequency: 'WEEKLY',
        professionFilters: [],
        regionFilters: [],
      },
    });
  }

  return preferences;
}

/**
 * Update user email preferences
 */
export async function updateEmailPreferences(
  userId: string,
  data: Partial<EmailPreferenceData>
) {
  return prisma.emailPreference.upsert({
    where: { userId },
    create: {
      userId,
      allowTransactional: true, // Always locked to true
      allowDigest: data.allowDigest ?? true,
      digestFrequency: data.digestFrequency ?? 'WEEKLY',
      professionFilters: data.professionFilters ?? [],
      regionFilters: data.regionFilters ?? [],
    },
    update: {
      // allowTransactional is always locked to true
      allowDigest: data.allowDigest,
      digestFrequency: data.digestFrequency,
      professionFilters: data.professionFilters,
      regionFilters: data.regionFilters,
    },
  });
}

/**
 * Check if user should receive digest emails
 */
export async function shouldReceiveDigest(userId: string): Promise<boolean> {
  const preferences = await getUserEmailPreferences(userId);
  return preferences.allowDigest && preferences.digestFrequency !== 'NEVER';
}

/**
 * Get digest frequency for user
 */
export async function getDigestFrequency(userId: string): Promise<DigestFrequency> {
  const preferences = await getUserEmailPreferences(userId);
  return preferences.digestFrequency;
}
