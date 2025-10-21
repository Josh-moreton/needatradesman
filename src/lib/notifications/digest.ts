/**
 * Job digest service
 * Generates daily/weekly job digests for tradespeople based on their preferences
 */

import { prisma } from '@/lib/prisma';
import { JobCategory, DigestFrequency, Prisma } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const logger = createLogger('digest-service');

interface DigestJob {
  id: string;
  title: string;
  category: JobCategory;
  location: string;
  budget?: number;
  createdAt: Date;
}

/**
 * Get jobs for digest based on user preferences
 */
export async function getJobsForDigest(
  userId: string,
  frequency: DigestFrequency,
  maxJobs = 10
): Promise<DigestJob[]> {
  // Get user preferences
  const preferences = await prisma.emailPreference.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          trades: true,
          email: true,
        },
      },
    },
  });

  if (!preferences || !preferences.user) {
    logger.warn({ userId }, 'User preferences not found for digest');
    return [];
  }

  // Determine time window based on frequency
  const now = new Date();
  const timeWindow = new Date();

  if (frequency === 'DAILY') {
    timeWindow.setDate(now.getDate() - 1); // Last 24 hours
  } else if (frequency === 'WEEKLY') {
    timeWindow.setDate(now.getDate() - 7); // Last 7 days
  } else {
    return []; // NEVER - no digest
  }

  // Build query filters
  let categoryFilter: Prisma.JobWhereInput = {};
  if (preferences.professionFilters && preferences.professionFilters.length > 0) {
    categoryFilter = { category: { in: preferences.professionFilters } };
  } else if (preferences.user.trades && preferences.user.trades.length > 0) {
    categoryFilter = { category: { in: preferences.user.trades } };
  }

  const regionFilter = preferences.regionFilters && preferences.regionFilters.length > 0
    ? {
      OR: preferences.regionFilters.flatMap(region => [
        { city: { contains: region, mode: 'insensitive' as const } },
        { postcode: { contains: region, mode: 'insensitive' as const } },
        { location: { contains: region, mode: 'insensitive' as const } },
      ]),
    }
    : {};

  // Query jobs
  const jobs = await prisma.job.findMany({
    where: {
      status: 'OPEN',
      createdAt: {
        gte: timeWindow,
      },
      ...categoryFilter,
      ...regionFilter,
    },
    select: {
      id: true,
      title: true,
      category: true,
      location: true,
      budget: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: maxJobs,
  });

  return jobs.map(job => ({
    id: job.id,
    title: job.title,
    category: job.category,
    location: job.location,
    budget: job.budget ? Number(job.budget) : undefined,
    createdAt: job.createdAt,
  }));
}

/**
 * Get all users who should receive a digest for the given frequency
 */
export async function getUsersForDigest(frequency: DigestFrequency) {
  return prisma.emailPreference.findMany({
    where: {
      allowDigest: true,
      digestFrequency: frequency,
      user: {
        role: 'TRADESPERSON', // Only tradespeople receive job digests
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          trades: true,
        },
      },
    },
  });
}
