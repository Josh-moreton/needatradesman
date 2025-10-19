/**
 * Trade and location utilities for programmatic pages
 */

import { JobCategory } from "@prisma/client";

// Trade slug mappings (URL-friendly)
export const TRADE_SLUGS: Record<JobCategory, string> = {
  PLUMBING: "plumbers",
  ELECTRICAL: "electricians",
  CARPENTRY: "carpenters",
  BRICKLAYING: "bricklayers",
  PLASTERING: "plasterers",
  PAINTING: "painters",
  LANDSCAPING: "landscapers",
  CLEANING: "cleaners",
  HANDYMAN: "handyman",
  OTHER: "tradespeople",
};

// Reverse mapping for slug to trade
export const SLUG_TO_TRADE: Record<string, JobCategory> = Object.entries(
  TRADE_SLUGS
).reduce(
  (acc, [trade, slug]) => {
    acc[slug] = trade as JobCategory;
    return acc;
  },
  {} as Record<string, JobCategory>
);

// Trade display names (singular)
export const TRADE_DISPLAY_NAMES: Record<JobCategory, string> = {
  PLUMBING: "Plumber",
  ELECTRICAL: "Electrician",
  CARPENTRY: "Carpenter",
  BRICKLAYING: "Bricklayer",
  PLASTERING: "Plasterer",
  PAINTING: "Painter & Decorator",
  LANDSCAPING: "Landscaper",
  CLEANING: "Cleaner",
  HANDYMAN: "Handyman",
  OTHER: "Tradesperson",
};

// Trade plural display names
export const TRADE_PLURAL_NAMES: Record<JobCategory, string> = {
  PLUMBING: "Plumbers",
  ELECTRICAL: "Electricians",
  CARPENTRY: "Carpenters",
  BRICKLAYING: "Bricklayers",
  PLASTERING: "Plasterers",
  PAINTING: "Painters & Decorators",
  LANDSCAPING: "Landscapers",
  CLEANING: "Cleaners",
  HANDYMAN: "Handymen",
  OTHER: "Tradespeople",
};

// Service display names for schema
export const TRADE_SERVICE_NAMES: Record<JobCategory, string> = {
  PLUMBING: "Plumbing Services",
  ELECTRICAL: "Electrical Services",
  CARPENTRY: "Carpentry Services",
  BRICKLAYING: "Bricklaying Services",
  PLASTERING: "Plastering Services",
  PAINTING: "Painting and Decorating Services",
  LANDSCAPING: "Landscaping Services",
  CLEANING: "Cleaning Services",
  HANDYMAN: "Handyman Services",
  OTHER: "General Trade Services",
};

// Location slug normalization
export function normalizeLocationSlug(location: string): string {
  return location
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Parse location slug back to display name
export function parseLocationSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Related trades for internal linking
export const RELATED_TRADES: Record<JobCategory, JobCategory[]> = {
  PLUMBING: [JobCategory.ELECTRICAL, JobCategory.HANDYMAN],
  ELECTRICAL: [JobCategory.PLUMBING, JobCategory.HANDYMAN],
  CARPENTRY: [JobCategory.HANDYMAN, JobCategory.PAINTING],
  BRICKLAYING: [JobCategory.LANDSCAPING, JobCategory.HANDYMAN],
  PLASTERING: [JobCategory.PAINTING, JobCategory.HANDYMAN],
  PAINTING: [JobCategory.PLASTERING, JobCategory.CARPENTRY],
  LANDSCAPING: [JobCategory.BRICKLAYING, JobCategory.HANDYMAN],
  CLEANING: [JobCategory.PAINTING, JobCategory.HANDYMAN],
  HANDYMAN: [JobCategory.ELECTRICAL, JobCategory.PLUMBING, JobCategory.CARPENTRY],
  OTHER: [JobCategory.HANDYMAN],
};

export function getRelatedTrades(trade: JobCategory): JobCategory[] {
  return RELATED_TRADES[trade] || [];
}

// UK cities for programmatic pages (most populous)
export const UK_MAJOR_CITIES = [
  "London",
  "Birmingham",
  "Manchester",
  "Glasgow",
  "Leeds",
  "Liverpool",
  "Newcastle",
  "Sheffield",
  "Bristol",
  "Edinburgh",
  "Cardiff",
  "Belfast",
  "Leicester",
  "Nottingham",
  "Coventry",
  "Bradford",
  "Stoke-on-Trent",
  "Wolverhampton",
  "Derby",
  "Southampton",
  "Portsmouth",
  "Brighton",
  "Plymouth",
  "Reading",
  "Northampton",
  "Luton",
  "Milton Keynes",
  "Aberdeen",
  "Swindon",
  "Norwich",
];

// Nearby cities/areas mapping (for internal linking)
export const NEARBY_AREAS: Record<string, string[]> = {
  london: [
    "Westminster",
    "Camden",
    "Islington",
    "Hackney",
    "Tower Hamlets",
    "Greenwich",
    "Croydon",
    "Bromley",
  ],
  birmingham: ["Solihull", "Dudley", "Walsall", "Wolverhampton", "Coventry"],
  manchester: ["Salford", "Stockport", "Bolton", "Rochdale", "Oldham"],
  glasgow: ["East Renfrewshire", "Renfrewshire", "East Dunbartonshire"],
  edinburgh: ["Midlothian", "East Lothian", "West Lothian"],
  // Add more as needed
};

export function getNearbyAreas(location: string): string[] {
  const slug = normalizeLocationSlug(location);
  return NEARBY_AREAS[slug] || [];
}

// Validate if a trade slug is valid
export function isValidTradeSlug(slug: string): boolean {
  return slug in SLUG_TO_TRADE;
}

// Get trade from slug
export function getTradeFromSlug(slug: string): JobCategory | null {
  return SLUG_TO_TRADE[slug] || null;
}

// Get slug from trade
export function getSlugFromTrade(trade: JobCategory): string {
  return TRADE_SLUGS[trade];
}
