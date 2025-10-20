/**
 * JSON-LD Schema builders for structured data
 * Provides strongly-typed helpers for Organization, WebSite, Service, LocalBusiness, FAQ, and HowTo schemas
 */

import { JobCategory } from "@prisma/client";

// ============================================================================
// Type Definitions
// ============================================================================

export interface OrgSchemaParams {
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  companyNumber?: string;
}

export interface WebsiteSchemaParams {
  name: string;
  url: string;
  searchAction?: {
    target: string;
    queryInput: string;
  };
}

export interface ServiceSchemaParams {
  trade: JobCategory;
  location?: string;
  priceRange?: string;
  priceUnit?: string;
  areaServed?: string | string[];
  availability?: string;
  url?: string;
}

export interface ProviderSchemaParams {
  name: string;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  telephone?: string;
  email?: string;
  url?: string;
  openingHours?: string[];
  geo?: {
    latitude: number;
    longitude: number;
  };
  areaServed?: string | string[];
  priceRange?: string;
  image?: string;
  reviews?: ReviewSchema[];
  aggregateRating?: {
    ratingValue: number;
    reviewCount: number;
    bestRating?: number;
    worstRating?: number;
  };
}

export interface ReviewSchema {
  "@type": "Review";
  author: {
    "@type": "Person";
    name: string;
  };
  reviewRating: {
    "@type": "Rating";
    ratingValue: number;
    bestRating?: number;
  };
  reviewBody?: string;
  datePublished?: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

export interface HowToSchemaParams {
  name: string;
  description?: string;
  steps: HowToStep[];
  totalTime?: string;
  estimatedCost?: {
    currency: string;
    value: string;
  };
  image?: string;
}

// ============================================================================
// Schema Builders
// ============================================================================

/**
 * Generate Organization schema
 * Use on homepage and brand pages
 */
export function orgSchema(params: OrgSchemaParams) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: params.name,
    url: params.url,
  } as Record<string, unknown>;

  if (params.logo) {
    schema.logo = params.logo;
  }

  if (params.sameAs && params.sameAs.length > 0) {
    schema.sameAs = params.sameAs;
  }

  if (params.companyNumber) {
    schema.identifier = params.companyNumber;
  }

  return schema;
}

/**
 * Generate WebSite schema with optional search action
 * Use on homepage
 */
export function websiteSchema(params: WebsiteSchemaParams) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: params.name,
    url: params.url,
  } as Record<string, unknown>;

  if (params.searchAction) {
    schema.potentialAction = {
      "@type": "SearchAction",
      target: params.searchAction.target,
      "query-input": params.searchAction.queryInput,
    };
  }

  return schema;
}

/**
 * Trade category display names for schema
 */
const TRADE_DISPLAY_NAMES: Record<JobCategory, string> = {
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

/**
 * Generate Service schema for trade-location pages
 * Can also use Product schema for physical goods
 */
export function serviceSchema(params: ServiceSchemaParams) {
  const serviceName = TRADE_DISPLAY_NAMES[params.trade];
  const fullName = params.location
    ? `${serviceName} in ${params.location}`
    : serviceName;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: fullName,
    serviceType: serviceName,
  } as Record<string, unknown>;

  if (params.url) {
    schema.url = params.url;
  }

  if (params.areaServed) {
    schema.areaServed = Array.isArray(params.areaServed)
      ? params.areaServed.map((area) => ({
          "@type": "City",
          name: area,
        }))
      : {
          "@type": "City",
          name: params.areaServed,
        };
  }

  if (params.priceRange || params.priceUnit) {
    schema.offers = {
      "@type": "Offer",
      ...(params.priceRange && { priceRange: params.priceRange }),
      ...(params.priceUnit && { priceCurrency: params.priceUnit }),
      ...(params.availability && { availability: params.availability }),
    };
  }

  return schema;
}

/**
 * Generate HomeAndConstructionBusiness (LocalBusiness subclass) schema
 * For third-party provider/tradesperson pages
 * IMPORTANT: Only include reviews that are ABOUT the third-party business, not self-serving reviews
 */
export function providerSchema(params: ProviderSchemaParams) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: params.name,
  } as Record<string, unknown>;

  if (params.url) {
    schema.url = params.url;
  }

  if (params.telephone) {
    schema.telephone = params.telephone;
  }

  if (params.email) {
    schema.email = params.email;
  }

  if (params.image) {
    schema.image = params.image;
  }

  if (params.address) {
    schema.address = {
      "@type": "PostalAddress",
      ...params.address,
    };
  }

  if (params.geo) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: params.geo.latitude,
      longitude: params.geo.longitude,
    };
  }

  if (params.openingHours && params.openingHours.length > 0) {
    schema.openingHoursSpecification = params.openingHours.map((hours) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: hours,
    }));
  }

  if (params.areaServed) {
    schema.areaServed = Array.isArray(params.areaServed)
      ? params.areaServed.map((area) => ({
          "@type": "City",
          name: area,
        }))
      : {
          "@type": "City",
          name: params.areaServed,
        };
  }

  if (params.priceRange) {
    schema.priceRange = params.priceRange;
  }

  // Only include reviews if they are about the third-party business
  // NOT about the marketplace itself (to avoid self-serving review violations)
  if (params.reviews && params.reviews.length > 0) {
    schema.review = params.reviews;
  }

  if (params.aggregateRating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: params.aggregateRating.ratingValue,
      reviewCount: params.aggregateRating.reviewCount,
      bestRating: params.aggregateRating.bestRating ?? 5,
      worstRating: params.aggregateRating.worstRating ?? 1,
    };
  }

  return schema;
}

/**
 * Generate FAQPage schema
 * Use on guides and help pages with Q&A content
 */
export function faqSchema(faqs: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate HowTo schema
 * Use on instructional guides and tutorials
 */
export function howToSchema(params: HowToSchemaParams) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: params.name,
  } as Record<string, unknown>;

  if (params.description) {
    schema.description = params.description;
  }

  if (params.image) {
    schema.image = params.image;
  }

  if (params.totalTime) {
    schema.totalTime = params.totalTime;
  }

  if (params.estimatedCost) {
    schema.estimatedCost = {
      "@type": "MonetaryAmount",
      currency: params.estimatedCost.currency,
      value: params.estimatedCost.value,
    };
  }

  schema.step = params.steps.map((step, index) => {
    const stepSchema = {
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    } as Record<string, unknown>;

    if (step.image) {
      stepSchema.image = step.image;
    }

    if (step.url) {
      stepSchema.url = step.url;
    }

    return stepSchema;
  });

  return schema;
}

/**
 * Combine multiple schemas into a single @graph
 * Useful when you need multiple schemas on one page
 */
export function combineSchemas(schemas: unknown[]) {
  return {
    "@context": "https://schema.org",
    "@graph": schemas,
  };
}
