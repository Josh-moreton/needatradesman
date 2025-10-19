/**
 * Data loaders for programmatic pages (Trade×Location and Provider)
 * Includes caching strategies and ISR support
 */

import { JobCategory } from "@prisma/client";
import { prisma } from "./prisma";
import { redis } from "./redis";

// Cache TTLs
const CACHE_TTL = {
  PRICING: 86400, // 24 hours
  AVAILABILITY: 3600, // 1 hour
  PROVIDERS: 7200, // 2 hours
  LOCAL_RULES: 604800, // 7 days
};

// Publication gate thresholds
export const PUBLICATION_THRESHOLDS = {
  MIN_PROVIDERS: 3,
  MIN_DATA_POINTS: 2, // Need at least 2 of: pricing, availability, local rules
};

// ============================================================================
// Pricing Data
// ============================================================================

export interface PricingData {
  q1: number;
  q2: number;
  q3: number;
  unit: string;
  sampleSize: number;
}

export async function getPricingQuartiles(
  trade: JobCategory,
  location: string
): Promise<PricingData | null> {
  const cacheKey = `pricing:${trade}:${location.toLowerCase()}`;

  // Try cache first
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached && typeof cached === "string") {
      return JSON.parse(cached) as PricingData;
    }
  }

  // Fetch from database
  const pricing = await prisma.pricingQuartile.findFirst({
    where: {
      trade,
      location: {
        equals: location,
        mode: "insensitive",
      },
    },
    orderBy: {
      lastCalculated: "desc",
    },
  });

  if (!pricing) {
    return null;
  }

  const data: PricingData = {
    q1: pricing.q1.toNumber(),
    q2: pricing.q2.toNumber(),
    q3: pricing.q3.toNumber(),
    unit: pricing.unit,
    sampleSize: pricing.sampleSize,
  };

  // Cache the result
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL.PRICING });
  }

  return data;
}

// ============================================================================
// Availability Data
// ============================================================================

export interface AvailabilitySlot {
  providerId: string;
  providerName: string;
  date: Date;
  startTime: string;
  endTime: string;
}

export async function getNextAvailableSlots(
  trade: JobCategory,
  location: string,
  limit = 3
): Promise<AvailabilitySlot[]> {
  const cacheKey = `availability:${trade}:${location.toLowerCase()}:${limit}`;

  // Try cache first
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached && typeof cached === "string") {
      const parsed = JSON.parse(cached) as AvailabilitySlot[];
      // Deserialize dates
      return parsed.map((slot) => ({
        ...slot,
        date: new Date(slot.date),
      }));
    }
  }

  // Fetch providers in the area for this trade
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
    },
    select: {
      id: true,
      businessName: true,
    },
  });

  if (providers.length === 0) {
    return [];
  }

  const providerIds = providers.map((p) => p.id);

  // Fetch availability
  const now = new Date();
  const slots = await prisma.providerAvailability.findMany({
    where: {
      providerId: {
        in: providerIds,
      },
      date: {
        gte: now,
      },
      isBooked: false,
    },
    orderBy: {
      date: "asc",
    },
    take: limit,
    include: {
      provider: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  const result: AvailabilitySlot[] = slots.map((slot) => ({
    providerId: slot.provider.id,
    providerName: slot.provider.businessName,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));

  // Cache for shorter time
  if (redis) {
    await redis.set(cacheKey, JSON.stringify(result), { ex: CACHE_TTL.AVAILABILITY });
  }

  return result;
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
  hasPricing: boolean;
  hasAvailability: boolean;
  hasLocalRules: boolean;
  dataPointCount: number;
  shouldPublish: boolean;
}

export async function checkPageQuality(
  trade: JobCategory,
  location: string
): Promise<PageQualityMetrics> {
  // Fetch all data in parallel
  const [providers, pricing, availability, rules] = await Promise.all([
    getProvidersForLocation(trade, location, 10), // Check more than minimum
    getPricingQuartiles(trade, location),
    getNextAvailableSlots(trade, location, 1), // Just check if any exist
    getLocalRules(trade, location),
  ]);

  const hasProviders = providers.length >= PUBLICATION_THRESHOLDS.MIN_PROVIDERS;
  const hasPricing = pricing !== null;
  const hasAvailability = availability.length > 0;
  const hasLocalRules = rules.length > 0;

  // Count data points (excluding providers which is mandatory)
  let dataPointCount = 0;
  if (hasPricing) dataPointCount++;
  if (hasAvailability) dataPointCount++;
  if (hasLocalRules) dataPointCount++;

  const shouldPublish =
    hasProviders && dataPointCount >= PUBLICATION_THRESHOLDS.MIN_DATA_POINTS;

  return {
    hasProviders,
    providerCount: providers.length,
    hasPricing,
    hasAvailability,
    hasLocalRules,
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
  openingHours: unknown;
  accreditations: string[];
  gaseSafeNumber: string | null;
  niceicNumber: string | null;
  logo: string | null;
  coverImage: string | null;
  averageRating: number | null;
  reviewCount: number;
  nextAvailable: Date | null;
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
    openingHours: provider.openingHours,
    accreditations: provider.accreditations,
    gaseSafeNumber: provider.gaseSafeNumber,
    niceicNumber: provider.niceicNumber,
    logo: provider.logo,
    coverImage: provider.coverImage,
    averageRating: provider.averageRating?.toNumber() || null,
    reviewCount: provider.reviewCount,
    nextAvailable: provider.nextAvailable,
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
    `pricing:${trade}:${locationLower}`,
    `availability:${trade}:${locationLower}:*`,
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
