# Programmatic Pages - Trade×Location & Provider Profiles

This document describes the implementation of programmatic pages for Need A Tradesman, designed to provide high-quality, SEO-optimized pages at scale.

## Overview

We implement two types of programmatic pages:

1. **Trade×Location Pages** (`/[trade]/[location]`) - e.g., `/electricians/london`
2. **Provider Profile Pages** (`/providers/[slug]`) - e.g., `/providers/morningside-electrical`

## Trade×Location Pages

### URL Structure

- Pattern: `/{trade-slug}/{location-slug}`
- Examples:
  - `/electricians/london`
  - `/plumbers/edinburgh`
  - `/carpenters/manchester`

### Trade Slugs

Trade slugs are URL-friendly versions of job categories:

| Category | Slug | Display Name |
|----------|------|--------------|
| ELECTRICAL | electricians | Electricians |
| PLUMBING | plumbers | Plumbers |
| CARPENTRY | carpenters | Carpenters |
| BRICKLAYING | bricklayers | Bricklayers |
| PLASTERING | plasterers | Plasterers |
| PAINTING | painters | Painters & Decorators |
| LANDSCAPING | landscapers | Landscapers |
| CLEANING | cleaners | Cleaners |
| HANDYMAN | handyman | Handymen |

### Location Slugs

Location slugs are normalized city/area names:
- Lowercase
- Hyphens instead of spaces
- No special characters
- Examples: `london`, `edinburgh`, `stoke-on-trent`, `milton-keynes`

### Unique Content Blocks

Each Trade×Location page includes:

#### 1. Marketplace Activity Statistics
- **Active Tradespeople**: Count of providers active in last 30 days
- **Recent Jobs**: Number of jobs posted in this trade/location in last 30 days
- **Average Response Time**: Typical hours to receive quotes from local tradespeople
- Source: Aggregated from `Provider` and `Job` tables
- Updated hourly via cache
- Demonstrates real market activity and liquidity

#### 2. Local Regulations &amp; Safety
- Relevant regulations for the trade in that location
- Sources from `LocalRule` table (location-specific + UK-wide)
- Includes:
  - Part P compliance (electrical)
  - Gas Safe requirements (plumbing/heating)
  - FENSA certification (windows/doors)
  - Local council requirements
- Each rule includes title, description, and optional reference link

#### 3. Top Providers
- Lists top 6 providers in the area
- Sorted by rating and review count
- Shows business name, rating, review count, and location
- Links to provider profile pages

#### 4. Internal Linking
- **Nearby Areas**: Links to the same trade in neighboring locations
- **Related Trades**: Links to related services in the same location
- **Breadcrumbs**: Home → Trade → Location

### Publication Gate

Pages are set to `noindex` if they don't meet quality thresholds:

**Requirements for indexing:**
1. Minimum **3 providers** in the area
2. At least **2 data points** from:
   - Marketplace activity stats (active providers, recent jobs)
   - Local regulations
   - Provider reviews

If requirements aren't met:
- `robots` meta tag set to `noindex, follow`
- Page excluded from sitemap
- Warning shown to users that data is being gathered

### ISR Configuration

- Revalidation: **4 hours** (14400 seconds)
- Caching strategy:
  - Activity stats: 1 hour
  - Providers: 2 hours
  - Local rules: 7 days

### Structured Data

Uses `serviceSchema()` from `/lib/seo/schema.ts`:

```typescript
{
  "@type": "Service",
  "name": "Electrical Services in London",
  "serviceType": "Electrical Services",
  "url": "https://needatradesman.com/electricians/london",
  "areaServed": {
    "@type": "City",
    "name": "London"
  },
  "offers": {
    "@type": "Offer",
    "priceRange": "£150-£400",
    "priceCurrency": "GBP",
    "availability": "https://schema.org/InStock"
  }
}
```

### Metadata

- **Title**: `{Trade Plural} in {Location} | Need A Tradesman`
- **Description**: Includes trade, location, provider count, and value proposition
- **OpenGraph**: Full OG tags for social sharing
- **Robots**: Dynamic based on quality metrics

## Provider Profile Pages

### URL Structure

- Pattern: `/providers/{slug}`
- Slug: URL-friendly business identifier
- Examples:
  - `/providers/morningside-electrical`
  - `/providers/smith-plumbing-services`

### Profile Completeness

Required fields for indexing:
- Business name
- At least one trade/service
- Location (city/town)
- Contact telephone

Incomplete profiles are set to `noindex, follow`.

### Page Sections

#### 1. Header
- Business logo (if available)
- Business name
- Average rating and review count
- Location
- Primary CTAs: "Call Now" and "Get a Quote"

#### 2. Services
- List of trades/services offered
- Displayed as badges

#### 3. About
- Business description
- Optional free-text content

#### 4. Service Areas
- List of cities/regions served
- Used for matching to Trade×Location pages

#### 5. Contact &amp; Hours
- Telephone (clickable tel: link)
- Email (clickable mailto: link)
- Website (external link)
- Physical address
- Opening hours (if available)

#### 6. Accreditations
- List of certifications
- Gas Safe number
- NICEIC number
- Trade-specific accreditations

#### 7. Reviews
- Customer reviews with ratings
- Verified purchase badges
- Review date and customer name
- Review text

#### 8. Activity & Performance
- Jobs completed count
- Average response time
- Last active date

### Structured Data

Uses `providerSchema()` from `/lib/seo/schema.ts`:

```typescript
{
  "@type": "HomeAndConstructionBusiness",
  "name": "John's Plumbing Services",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 High Street",
    "addressLocality": "London",
    "postalCode": "SW1A 1AA",
    "addressCountry": "GB"
  },
  "telephone": "+44 20 1234 5678",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.8,
    "reviewCount": 42
  },
  "review": [...]  // Only include reviews ABOUT the provider
}
```

**IMPORTANT**: Only include reviews that are genuinely about the third-party tradesperson, never self-serving reviews about the marketplace.

### ISR Configuration

- Revalidation: **2 hours** (7200 seconds)
- No additional caching layers (provider data is always fresh from DB)

## Data Models

### LocalRule
```typescript
{
  trade: JobCategory
  location: string         // City/region or "UK" for national
  ruleType: string        // "license", "regulation", "safety", "waste"
  title: string
  description: string
  reference: string?      // URL to official guidance
  isActive: boolean
  priority: number        // Higher = shown first
}
```

### Provider
```typescript
{
  slug: string            // URL identifier
  businessName: string
  userId: string          // Link to User
  trades: JobCategory[]
  isPublished: boolean    // Publication gate
  
  // NAP
  address: string
  addressLocality: string
  postalCode: string
  telephone: string
  email: string
  
  // Service areas
  serviceAreas: string[]  // Cities/regions
  
  // Accreditations
  accreditations: string[]
  gaseSafeNumber: string?
  niceicNumber: string?
  
  // Reviews
  averageRating: Decimal
  reviewCount: number
  
  // Activity tracking
  responseTimeHours: number?  // Avg response time
  jobsCompleted: number       // Total completed jobs
  lastActive: DateTime?       // Last activity timestamp
}
```

### ProviderReview
```typescript
{
  providerId: string
  customerName: string
  rating: number          // 1-5
  reviewText: string?
  jobCompleted: DateTime?
  isVerified: boolean     // Verified purchase
  isPublished: boolean
}
```

## Data Loaders

All data loaders are in `/lib/programmatic-data.ts`:

- `getMarketplaceActivity(trade, location)` - Fetch activity stats (active providers, recent jobs, response time) with 1h cache
- `getProvidersForLocation(trade, location, limit)` - Fetch providers with 2h cache
- `getLocalRules(trade, location)` - Fetch regulations with 7-day cache
- `checkPageQuality(trade, location)` - Publication gate checks (providers, activity, rules, reviews)
- `getProviderBySlug(slug)` - Fetch provider profile
- `getProviderReviews(providerId, limit)` - Fetch published reviews
- `isProviderComplete(provider)` - Completeness gate

### Cache Invalidation

- `invalidateTradeLocationCache(trade, location)` - Clear all caches for a trade×location
- `invalidateProviderCache(providerId)` - Clear provider-related caches

Called after data updates via APIs or admin actions.

## Performance Budgets

### Trade×Location Pages
- **Hydrated JS**: ≤ 80KB
- **LCP**: ≤ 2.5s
- **INP**: ≤ 200ms
- **CLS**: ≤ 0.1

### Provider Pages
- **Hydrated JS**: ≤ 60KB (simpler page)
- **LCP**: ≤ 2.5s (images optimized)
- **INP**: ≤ 200ms
- **CLS**: ≤ 0.1

## SEO Best Practices

### URLs
- Clean, descriptive slugs
- Hyphens for spaces
- Lowercase
- No special characters
- Include keywords (trade + location)

### Titles
- Unique per page
- Include primary keyword
- Format: `{Trade Plural} in {Location} | Need A Tradesman`
- Max 60 characters

### Meta Descriptions
- 150-160 characters
- Include location, trade, and value prop
- Include provider count if > 0
- Call to action

### Headings
- H1: Unique, includes trade + location
- H2: Section headings (Price, Availability, Providers, etc.)
- Proper hierarchy (no skipping levels)

### Content
- Minimum 300 words per page (including dynamic content)
- No duplicate content
- Unique value in every section
- Regular updates via ISR

### Images
- Provider logos optimized
- Alt text for all images
- Lazy loading for below-fold images
- WebP format where possible

### Internal Linking
- Breadcrumbs on all pages
- Related trades (horizontal)
- Nearby areas (geographic)
- Provider profiles from Trade×Location
- Trade×Location from provider service areas

## Canonical Strategy

### Trade×Location Pages
- Self-canonical
- No duplicate city/postcode issues (postcode pages canonical to city if overlap > 70%)
- `alternateName` for trade synonyms (e.g., "sparky" → "electrician")

### Provider Pages
- Self-canonical
- One slug per provider (enforced by unique constraint)

## Sitemap

Generate dynamic sitemap including:
- All Trade×Location pages that pass publication gate
- All published provider profiles that are complete
- Update frequency:
  - Trade×Location: weekly
  - Provider profiles: daily
- Priority:
  - Homepage: 1.0
  - Trade pages: 0.8
  - Trade×Location: 0.7
  - Provider profiles: 0.6

## Monitoring

Track in analytics:
- Pages with noindex (thin content)
- Bounce rate by page quality score
- Conversion rate (quote requests) by content completeness
- Average time on page
- Internal link click-through rate

## Future Enhancements

- [ ] FAQ schema per trade×location
- [ ] How-to guides for common jobs
- [ ] Provider video content
- [ ] Real-time chat availability
- [ ] Dynamic pricing calculator
- [ ] A/B testing for CTA placement
- [ ] Multilingual support (Welsh for Welsh pages)
- [ ] Voice search optimization

## Testing

### Unit Tests
- Data loaders return expected shape
- Cache invalidation works correctly
- Publication gate logic is accurate
- Slug normalization is idempotent

### Integration Tests
- Pages render without errors
- Structured data validates in Google Rich Results Test
- ISR revalidation triggers correctly
- Cache TTLs are respected

### E2E Tests (Playwright)
- `/electricians/edinburgh` renders all sections
- Removing pricing data triggers noindex
- `/providers/morningside-electrical` shows full profile
- Incomplete provider profile is noindex
- Internal links resolve to canonical pages
- Performance metrics within budgets

## Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Seed data populated for major cities
- [ ] All pages pass type-check and lint
- [ ] Structured data validates in Google Rich Results Test
- [ ] Performance budgets met in Lighthouse
- [ ] ISR working in production environment
- [ ] Cache invalidation tested
- [ ] Sitemap generated and submitted
- [ ] Google Search Console monitoring configured
- [ ] Analytics goals set up for conversions

## References

- [Schema.org Service](https://schema.org/Service)
- [Schema.org LocalBusiness](https://schema.org/LocalBusiness)
- [Google Structured Data Guidelines](https://developers.google.com/search/docs/appearance/structured-data)
- [Next.js ISR Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
- [Web Vitals](https://web.dev/vitals/)
