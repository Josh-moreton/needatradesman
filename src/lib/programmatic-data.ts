/**
 * Data loaders for programmatic pages (Trade×Location and Provider)
 * Includes caching strategies and ISR support
 */

import { JobCategory } from "@prisma/client";
import { prisma } from "./prisma";
import { redis } from "./redis";

// Cache TTLs
const CACHE_TTL = {
  ACTIVITY: 3600, // 1 hour
  PROVIDERS: 7200, // 2 hours
  LOCAL_RULES: 604800, // 7 days
};

// Publication gate thresholds
export const PUBLICATION_THRESHOLDS = {
  MIN_PROVIDERS: 3,
  MIN_DATA_POINTS: 2, // Need at least 2 of: activity stats, local rules, provider reviews
};

// ============================================================================
// Marketplace Activity Data
// ============================================================================

export interface MarketplaceActivity {
  activeProviders: number; // Providers active in last 30 days
  recentJobs: number; // Jobs posted in last 30 days
  avgResponseTime: number; // Average response time in hours
}

export async function getMarketplaceActivity(
  trade: JobCategory,
  location: string
): Promise<MarketplaceActivity | null> {
  const cacheKey = `activity:${trade}:${location.toLowerCase()}`;

  // Try cache first
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached && typeof cached === "string") {
      return JSON.parse(cached) as MarketplaceActivity;
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Count active providers (published and active in last 30 days)
  const activeProvidersCount = await prisma.provider.count({
    where: {
      trades: {
        has: trade,
      },
      isPublished: true,
      OR: [
        {
          addressLocality: {
            equals: location,
            mode: "insensitive",
          },
        },
        {
          serviceAreas: {
            hasSome: [location],
          },
        },
      ],
      lastActive: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Count recent jobs in this trade/location
  const recentJobsCount = await prisma.job.count({
    where: {
      category: trade,
      OR: [
        {
          city: {
            equals: location,
            mode: "insensitive",
          },
        },
        {
          location: {
            contains: location,
            mode: "insensitive",
          },
        },
      ],
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Get average response time from providers in this area
  const providers = await prisma.provider.findMany({
    where: {
      trades: {
        has: trade,
      },
      isPublished: true,
      OR: [
        {
          addressLocality: {
            equals: location,
            mode: "insensitive",
          },
        },
        {
          serviceAreas: {
            hasSome: [location],
          },
        },
      ],
      responseTimeHours: {
        not: null,
      },
    },
    select: {
      responseTimeHours: true,
    },
  });

  const avgResponseTime =
    providers.length > 0
      ? Math.round(
          providers.reduce((sum, p) => sum + (p.responseTimeHours || 24), 0) /
            providers.length
        )
      : 24;

  const data: MarketplaceActivity = {
    activeProviders: activeProvidersCount,
    recentJobs: recentJobsCount,
    avgResponseTime,
  };

  // Cache the result
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL.ACTIVITY });
  }

  return data;
}

// ============================================================================
// Provider Data
// ============================================================================

export interface ProviderSummary {
  id: string;
  slug: string;
  businessName: string;
  averageRating: number | null;
  reviewCount: number;
  trades: JobCategory[];
  addressLocality: string | null;
}

export async function getProvidersForLocation(
  trade: JobCategory,
  location: string,
  limit = 6
): Promise<ProviderSummary[]> {
  const cacheKey = `providers:${trade}:${location.toLowerCase()}:${limit}`;

  // Try cache first
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached && typeof cached === "string") {
      return JSON.parse(cached) as ProviderSummary[];
    }
  }

  const providers = await prisma.provider.findMany({
    where: {
      isPublished: true,
      trades: {
        has: trade,
      },
      OR: [
        {
          addressLocality: {
            equals: location,
            mode: "insensitive",
          },
        },
        {
          serviceAreas: {
            hasSome: [location],
          },
        },
      ],
    },
    orderBy: [
      {
        averageRating: "desc",
      },
      {
        reviewCount: "desc",
      },
    ],
    take: limit,
    select: {
      id: true,
      slug: true,
      businessName: true,
      averageRating: true,
      reviewCount: true,
      trades: true,
      addressLocality: true,
    },
  });

  const result: ProviderSummary[] = providers.map((p) => ({
    id: p.id,
    slug: p.slug,
    businessName: p.businessName,
    averageRating: p.averageRating?.toNumber() || null,
    reviewCount: p.reviewCount,
    trades: p.trades,
    addressLocality: p.addressLocality,
  }));

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.PROVIDERS });
  }

  return result;
}

// ============================================================================
// Local Rules Data
// ============================================================================

export interface LocalRuleData {
  id: string;
  ruleType: string;
  title: string;
  description: string;
  reference: string | null;
  priority: number;
}

export async function getLocalRules(
  trade: JobCategory,
  location: string
): Promise<LocalRuleData[]> {
  const cacheKey = `rules:${trade}:${location.toLowerCase()}`;

  // Try cache first
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached && typeof cached === "string") {
      return JSON.parse(cached) as LocalRuleData[];
    }
  }

  // Fetch rules for location and national rules
  const rules = await prisma.localRule.findMany({
    where: {
      trade,
      isActive: true,
      OR: [
        {
          location: {
            equals: location,
            mode: "insensitive",
          },
        },
        {
          location: "UK",
        },
      ],
    },
    orderBy: [
      {
        priority: "desc",
      },
      {
        title: "asc",
      },
    ],
  });

  const result: LocalRuleData[] = rules.map((r) => ({
    id: r.id,
    ruleType: r.ruleType,
    title: r.title,
    description: r.description,
    reference: r.reference,
    priority: r.priority,
  }));

  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.LOCAL_RULES });
  }

  return result;
}

// ============================================================================
// Publication Gate Logic
// ============================================================================

export interface PageQualityMetrics {
  hasProviders: boolean;
  providerCount: number;
  hasActivity: boolean;
  hasLocalRules: boolean;
  hasReviews: boolean;
  dataPointCount: number;
  shouldPublish: boolean;
}

export async function checkPageQuality(
  trade: JobCategory,
  location: string
): Promise<PageQualityMetrics> {
  // Fetch all data in parallel
  const [providers, activity, rules] = await Promise.all([
    getProvidersForLocation(trade, location, 10), // Check more than minimum
    getMarketplaceActivity(trade, location),
    getLocalRules(trade, location),
  ]);

  const hasProviders = providers.length >= PUBLICATION_THRESHOLDS.MIN_PROVIDERS;
  const hasActivity = activity !== null && activity.activeProviders > 0;
  const hasLocalRules = rules.length > 0;
  
  // Check if any providers have reviews
  const hasReviews = providers.some(p => p.reviewCount > 0);

  // Count data points (excluding providers which is mandatory)
  let dataPointCount = 0;
  if (hasActivity) dataPointCount++;
  if (hasLocalRules) dataPointCount++;
  if (hasReviews) dataPointCount++;

  const shouldPublish =
    hasProviders && dataPointCount >= PUBLICATION_THRESHOLDS.MIN_DATA_POINTS;

  return {
    hasProviders,
    providerCount: providers.length,
    hasActivity,
    hasLocalRules,
    hasReviews,
    dataPointCount,
    shouldPublish,
  };
}

// ============================================================================
// Provider Profile Data
// ============================================================================

export interface ProviderProfile {
  id: string;
  slug: string;
  businessName: string;
  description: string | null;
  trades: JobCategory[];
  address: string | null;
  addressLocality: string | null;
  addressRegion: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  telephone: string | null;
  email: string | null;
  website: string | null;
  serviceAreas: string[];
  accreditations: string[];
  gaseSafeNumber: string | null;
  niceicNumber: string | null;
  logo: string | null;
  coverImage: string | null;
  averageRating: number | null;
  reviewCount: number;
  responseTimeHours: number | null;
  jobsCompleted: number;
  lastActive: Date | null;
  isPublished: boolean;
}

export interface ProviderReviewData {
  id: string;
  customerName: string;
  rating: number;
  reviewText: string | null;
  jobCompleted: Date | null;
  isVerified: boolean;
  createdAt: Date;
}

export async function getProviderBySlug(
  slug: string
): Promise<ProviderProfile | null> {
  const provider = await prisma.provider.findUnique({
    where: { slug },
  });

  if (!provider) {
    return null;
  }

  return {
    id: provider.id,
    slug: provider.slug,
    businessName: provider.businessName,
    description: provider.description,
    trades: provider.trades,
    address: provider.address,
    addressLocality: provider.addressLocality,
    addressRegion: provider.addressRegion,
    postalCode: provider.postalCode,
    latitude: provider.latitude,
    longitude: provider.longitude,
    telephone: provider.telephone,
    email: provider.email,
    website: provider.website,
    serviceAreas: provider.serviceAreas,
    accreditations: provider.accreditations,
    gaseSafeNumber: provider.gaseSafeNumber,
    niceicNumber: provider.niceicNumber,
    logo: provider.logo,
    coverImage: provider.coverImage,
    averageRating: provider.averageRating?.toNumber() || null,
    reviewCount: provider.reviewCount,
    responseTimeHours: provider.responseTimeHours,
    jobsCompleted: provider.jobsCompleted,
    lastActive: provider.lastActive,
    isPublished: provider.isPublished,
  };
}

export async function getProviderReviews(
  providerId: string,
  limit = 10
): Promise<ProviderReviewData[]> {
  const reviews = await prisma.providerReview.findMany({
    where: {
      providerId,
      isPublished: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return reviews.map((r) => ({
    id: r.id,
    customerName: r.customerName,
    rating: r.rating,
    reviewText: r.reviewText,
    jobCompleted: r.jobCompleted,
    isVerified: r.isVerified,
    createdAt: r.createdAt,
  }));
}

export function isProviderComplete(provider: ProviderProfile): boolean {
  // Check mandatory fields for publication
  return !!(
    provider.businessName &&
    provider.trades.length > 0 &&
    provider.addressLocality &&
    provider.telephone
  );
}

// ============================================================================
// Cache Invalidation
// ============================================================================

export async function invalidateTradeLocationCache(
  trade: JobCategory,
  location: string
): Promise<void> {
  if (!redis) return;

  const locationLower = location.toLowerCase();
  const keys = [
    `activity:${trade}:${locationLower}`,
    `providers:${trade}:${locationLower}:*`,
    `rules:${trade}:${locationLower}`,
  ];

  // Delete keys matching patterns
  for (const key of keys) {
    if (key.includes("*")) {
      // For wildcard patterns, we'd need to scan and delete
      // For now, just set short TTL or skip
      continue;
    }
    await redis.del(key);
  }
}

export async function invalidateProviderCache(providerId: string): Promise<void> {
  // For provider updates, we'd need to know their location/trades
  // This would be called after provider updates with specific context
  // For now, this is a placeholder
  console.log(`Provider cache invalidation needed for: ${providerId}`);
}
