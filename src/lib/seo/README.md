# Structured Data (JSON-LD) Implementation

This directory contains helpers for generating JSON-LD structured data markup to improve SEO and enable rich results in search engines.

## Overview

The implementation provides strongly-typed schema builders and a generic `<JsonLd />` component for embedding structured data in pages.

## Components

### `<JsonLd />` Component
Generic component for rendering JSON-LD scripts.

```tsx
import { JsonLd } from '@/components/seo/JsonLd';
import { orgSchema } from '@/lib/seo/schema';

const schema = orgSchema({
  name: "Need A Tradesman",
  url: "https://needatradesman.com",
  logo: "https://needatradesman.com/logo.png"
});

return <JsonLd data={schema} />;
```

## Schema Builders

### `orgSchema()` - Organization
Use on homepage and brand pages for organization identity.

```tsx
import { orgSchema } from '@/lib/seo/schema';

const schema = orgSchema({
  name: "Need A Tradesman",
  url: "https://needatradesman.com",
  logo: "https://needatradesman.com/logo.png",
  sameAs: [
    "https://www.facebook.com/needatradesman",
    "https://twitter.com/needatradesman"
  ],
  companyNumber: "12345678"
});
```

### `websiteSchema()` - WebSite
Use on homepage with search functionality.

```tsx
import { websiteSchema } from '@/lib/seo/schema';

const schema = websiteSchema({
  name: "Need A Tradesman",
  url: "https://needatradesman.com",
  searchAction: {
    target: "https://needatradesman.com/search?q={search_term_string}",
    queryInput: "required name=search_term_string"
  }
});
```

### `serviceSchema()` - Service
Use on trade-location pages to describe services offered.

```tsx
import { serviceSchema } from '@/lib/seo/schema';
import { JobCategory } from '@prisma/client';

const schema = serviceSchema({
  trade: JobCategory.PLUMBING,
  location: "London",
  priceRange: "£50-£150",
  priceUnit: "GBP",
  areaServed: ["London", "Westminster", "Camden"],
  availability: "https://schema.org/InStock",
  url: "https://needatradesman.com/services/plumbing/london"
});
```

### `providerSchema()` - HomeAndConstructionBusiness
Use on third-party provider/tradesperson profile pages.

**IMPORTANT**: Only include reviews ABOUT the third-party business, NOT self-serving reviews about the marketplace.

```tsx
import { providerSchema } from '@/lib/seo/schema';

const schema = providerSchema({
  name: "John's Plumbing Services",
  address: {
    streetAddress: "123 High Street",
    addressLocality: "London",
    postalCode: "SW1A 1AA",
    addressCountry: "GB"
  },
  telephone: "+44 20 1234 5678",
  email: "john@plumbing.example",
  url: "https://needatradesman.com/providers/johns-plumbing",
  geo: {
    latitude: 51.5074,
    longitude: -0.1278
  },
  openingHours: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  areaServed: ["London", "Greater London"],
  priceRange: "££",
  image: "https://needatradesman.com/providers/johns-plumbing/photo.jpg",
  // Only include if you have legitimate third-party reviews
  reviews: [
    {
      "@type": "Review",
      author: {
        "@type": "Person",
        name: "Jane Smith"
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: 5,
        bestRating: 5
      },
      reviewBody: "Excellent service!",
      datePublished: "2024-01-15"
    }
  ],
  aggregateRating: {
    ratingValue: 4.8,
    reviewCount: 42,
    bestRating: 5,
    worstRating: 1
  }
});
```

### `faqSchema()` - FAQPage
Use on guides and help pages with Q&A content.

```tsx
import { faqSchema } from '@/lib/seo/schema';

const schema = faqSchema([
  {
    question: "How do I hire a tradesperson?",
    answer: "Simply post your job, review quotes from verified tradespeople, and select the best one for your needs."
  },
  {
    question: "Are all tradespeople verified?",
    answer: "Yes, all tradespeople undergo verification checks before they can bid on jobs."
  }
]);
```

### `howToSchema()` - HowTo
Use on instructional guides and tutorials.

```tsx
import { howToSchema } from '@/lib/seo/schema';

const schema = howToSchema({
  name: "How to Post a Job",
  description: "A step-by-step guide to posting your first job on Need A Tradesman",
  totalTime: "PT5M",
  estimatedCost: {
    currency: "GBP",
    value: "0"
  },
  image: "https://needatradesman.com/guides/post-job.jpg",
  steps: [
    {
      name: "Create an account",
      text: "Sign up for a free account on Need A Tradesman",
      image: "https://needatradesman.com/guides/step1.jpg"
    },
    {
      name: "Describe your job",
      text: "Fill in the job details including title, description, and budget",
      image: "https://needatradesman.com/guides/step2.jpg"
    },
    {
      name: "Review quotes",
      text: "Wait for tradespeople to submit their quotes and select the best one"
    }
  ]
});
```

### `combineSchemas()` - Multiple Schemas
Combine multiple schemas on a single page using @graph.

```tsx
import { combineSchemas, orgSchema, websiteSchema } from '@/lib/seo/schema';

const org = orgSchema({
  name: "Need A Tradesman",
  url: "https://needatradesman.com"
});

const website = websiteSchema({
  name: "Need A Tradesman",
  url: "https://needatradesman.com"
});

const combined = combineSchemas([org, website]);

return <JsonLd data={combined} />;
```

## Best Practices

### 1. Avoid Self-Serving Reviews
**Never** add review markup about your own marketplace on your own pages. Only add reviews that are genuinely about third-party businesses (e.g., individual tradespeople).

### 2. Validate Your Markup
Use [Google's Rich Results Test](https://search.google.com/test/rich-results) to validate your JSON-LD:
- No errors should appear
- All required fields should be present
- Preview should render correctly

### 3. Use Appropriate Schema Types
- **Organization** + **WebSite**: Homepage only
- **Service**: Trade/category pages
- **HomeAndConstructionBusiness**: Individual provider profiles
- **FAQPage**: Help pages with Q&A
- **HowTo**: Tutorial/guide pages

### 4. Keep Data Accurate
- All information in schemas must match visible page content
- Don't add markup for content not on the page
- Keep prices, availability, and contact info up to date

### 5. Required vs Optional Fields
Follow schema.org guidelines for required fields:
- **Organization**: `name`, `url` (required)
- **Service**: `name`, `serviceType` (required)
- **LocalBusiness**: `name`, `address` (required for local SEO)

## CI Validation

To prevent invalid schema from being deployed, consider adding validation to CI:

```bash
# Install schema validator
npm install -g schema-dts

# Validate in CI
schema-dts validate src/**/*.tsx
```

## Examples in the Codebase

- **Homepage**: `src/app/page.tsx` - Organization + WebSite schemas
- **Service Pages**: (To be implemented) - Service schema with areaServed
- **Provider Pages**: (To be implemented) - HomeAndConstructionBusiness schema
- **FAQ/Guides**: (To be implemented) - FAQPage or HowTo schemas

## Resources

- [Schema.org Documentation](https://schema.org/)
- [Google Structured Data Guidelines](https://developers.google.com/search/docs/appearance/structured-data)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [JSON-LD Playground](https://json-ld.org/playground/)
