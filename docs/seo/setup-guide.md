# Programmatic Pages Setup Guide

This guide walks through setting up and populating data for the programmatic Trade×Location and Provider pages.

## Prerequisites

- Database configured and accessible
- Prisma client generated
- Environment variables set (DATABASE_URL, REDIS_URL, etc.)

## Step 1: Run Database Migration

Since we've updated the Prisma schema with new models, you'll need to create and run a migration:

```bash
# Create a new migration
pnpm prisma migrate dev --name add_programmatic_pages

# Or in production
pnpm prisma migrate deploy
```

This adds the following tables:
- `providers` - Provider/tradesperson profiles
- `provider_availability` - Availability slots
- `provider_reviews` - Customer reviews
- `pricing_quartiles` - Price data by trade×location
- `local_rules` - Regulations and safety requirements

## Step 2: Seed Initial Data

Run the seed script to populate test data for pricing and local rules:

```bash
# Install tsx if not already installed
pnpm add -D tsx

# Run the seed script
npx tsx scripts/seed-programmatic-data.ts
```

This creates:
- Pricing quartiles for major cities (London, Edinburgh, Manchester)
- UK-wide and location-specific regulations
- Sample data for trades: Electrical, Plumbing, Carpentry

## Step 3: Create Provider Profiles (Optional for Testing)

Provider profiles are typically created through the application when tradespeople complete their onboarding. For testing, you can create them manually:

```typescript
// Example: Creating a test provider
import { prisma } from './src/lib/prisma';
import { JobCategory } from '@prisma/client';

await prisma.provider.create({
  data: {
    slug: 'test-electrician-london',
    businessName: 'Test Electrical Services',
    userId: '<existing-user-id>', // Must link to a real user
    trades: [JobCategory.ELECTRICAL],
    isPublished: true,
    addressLocality: 'London',
    telephone: '+44 20 1234 5678',
    email: 'test@example.com',
    serviceAreas: ['London', 'Westminster', 'Camden'],
    accreditations: ['NICEIC', 'Part P Registered'],
  }
});
```

## Step 4: Access the Pages

Once data is seeded, you can access:

### Trade×Location Pages
- `/electricians/london`
- `/plumbers/edinburgh`
- `/carpenters/manchester`

### Provider Pages
- `/providers/{slug}` (after creating a provider)

## Step 5: Verify Publication Gates

Pages will only be indexed if they meet quality thresholds:

### Trade×Location Requirements
- ≥ 3 providers in the area
- ≥ 2 data points from: pricing, availability, local rules

Check page quality:
```typescript
import { checkPageQuality } from '@/lib/programmatic-data';
import { JobCategory } from '@prisma/client';

const quality = await checkPageQuality(JobCategory.ELECTRICAL, 'London');
console.log(quality);
// {
//   hasProviders: true,
//   providerCount: 5,
//   hasPricing: true,
//   hasAvailability: true,
//   hasLocalRules: true,
//   dataPointCount: 3,
//   shouldPublish: true
// }
```

### Provider Requirements
- Business name (required)
- At least one trade (required)
- Location/city (required)
- Contact telephone (required)

## Step 6: Configure Redis (Optional but Recommended)

For caching to work optimally, configure Redis/Upstash:

```bash
# .env.local
REDIS_URL=your_redis_url
# OR for Vercel KV
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

Without Redis, pages will still work but without caching benefits.

## Step 7: Generate Sitemap

The sitemap is generated dynamically at `/sitemap.xml` and includes:
- Static pages (homepage)
- Trade×Location pages that meet publication threshold
- Published provider profiles

Access it at: `http://localhost:3000/sitemap.xml`

## Step 8: Test in Development

```bash
# Start dev server
pnpm dev

# Visit test pages
# http://localhost:3000/electricians/london
# http://localhost:3000/electricians/edinburgh
```

Check:
- ✅ Page renders without errors
- ✅ Unique content blocks appear (pricing, availability, providers, rules)
- ✅ Internal links work (nearby areas, related trades)
- ✅ Breadcrumbs navigate correctly
- ✅ Structured data validates (use view-source and check JSON-LD)

## Step 9: Validate SEO

### Check Structured Data
1. View page source
2. Find `<script type="application/ld+json">`
3. Copy JSON content
4. Paste into [Google Rich Results Test](https://search.google.com/test/rich-results)

### Check Meta Tags
- Title includes trade + location
- Description is unique and helpful
- Robots tag is correct (noindex for thin pages)
- OpenGraph tags present

### Check Performance
```bash
# Run Lighthouse audit
npx lighthouse http://localhost:3000/electricians/london --view
```

Target scores:
- Performance: ≥ 90
- Accessibility: ≥ 95
- Best Practices: ≥ 95
- SEO: 100

## Troubleshooting

### Page Shows "We're still gathering information"

This means the page doesn't meet publication thresholds. Check:
1. Are there ≥3 providers for this trade×location?
2. Do you have pricing data?
3. Do you have local rules?

Add more data via seed script or manually.

### No Providers Showing

Check:
1. Provider `isPublished` is `true`
2. Provider has the trade in their `trades` array
3. Provider's `addressLocality` or `serviceAreas` includes the location

### Pricing Not Showing

Check:
1. PricingQuartile exists for trade×location
2. Location name matches exactly (case-insensitive)
3. Cache is not stale (clear with `invalidateTradeLocationCache`)

### Redis Connection Issues

If Redis is not configured, the app will still work but without caching. Check logs for:
```
Redis not configured - Redis features disabled
```

This is OK for development but should be fixed for production.

## Production Deployment

### Pre-deployment Checklist
- [ ] Run migrations on production database
- [ ] Seed production data (pricing, rules)
- [ ] Configure Redis/Upstash
- [ ] Set BASE_URL in sitemap.ts
- [ ] Test ISR revalidation
- [ ] Submit sitemap to Google Search Console
- [ ] Set up monitoring for noindex pages

### Post-deployment
1. Submit sitemap to Google Search Console
2. Monitor for crawl errors
3. Check Core Web Vitals in Search Console
4. Set up alerts for publication gate metrics
5. Review thin content pages weekly

## Maintenance

### Weekly Tasks
- Review pages with noindex
- Check cache hit rates
- Monitor provider completeness
- Update pricing data if needed

### Monthly Tasks
- Audit top-performing pages
- Review and update local rules
- Analyze conversion rates by content completeness
- Add new UK cities if demand exists

### Quarterly Tasks
- Full SEO audit
- Performance budget review
- Structured data validation
- Competitor analysis

## Support

For issues or questions:
- Check `/docs/seo/programmatic-pages.md` for detailed documentation
- Review `/src/lib/programmatic-data.ts` for data loader implementations
- Check Prisma schema in `/prisma/schema.prisma` for data models
