/**
 * Dynamic sitemap generation for programmatic pages
 * Includes Trade×Location and Provider pages that meet publication thresholds
 */

import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { JobCategory } from "@prisma/client";
import {
  TRADE_SLUGS,
  UK_MAJOR_CITIES,
  normalizeLocationSlug,
} from "@/lib/trade-location";
import { checkPageQuality } from "@/lib/programmatic-data";

const BASE_URL = "https://needatradesman.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // Trade×Location pages (only those that meet publication threshold)
  const tradeLocationPages: MetadataRoute.Sitemap = [];

  // Check all trade × major city combinations
  const trades = Object.keys(JobCategory) as JobCategory[];

  for (const trade of trades) {
    const tradeSlug = TRADE_SLUGS[trade];

    for (const city of UK_MAJOR_CITIES) {
      try {
        // Check if page meets publication threshold
        const quality = await checkPageQuality(trade, city);

        if (quality.shouldPublish) {
          tradeLocationPages.push({
            url: `${BASE_URL}/${tradeSlug}/${normalizeLocationSlug(city)}`,
            lastModified: now,
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
      } catch (error) {
        // Skip this combination if there's an error
        console.error(
          `Error checking quality for ${trade} in ${city}:`,
          error
        );
        continue;
      }
    }
  }

  // Provider profile pages (only published and complete)
  const providers = await prisma.provider.findMany({
    where: {
      isPublished: true,
      businessName: { not: "" },
      addressLocality: { not: null },
      telephone: { not: null },
    },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  const providerPages: MetadataRoute.Sitemap = providers.map((provider) => ({
    url: `${BASE_URL}/providers/${provider.slug}`,
    lastModified: provider.updatedAt,
    changeFrequency: "daily",
    priority: 0.6,
  }));

  return [...staticPages, ...tradeLocationPages, ...providerPages];
}
