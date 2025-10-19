/**
 * Trade × Location programmatic page template
 * URL: /[trade]/[location] e.g., /electricians/london
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getTradeFromSlug,
  parseLocationSlug,
  TRADE_PLURAL_NAMES,
  TRADE_SERVICE_NAMES,
  getNearbyAreas,
  getRelatedTrades,
  getSlugFromTrade,
  normalizeLocationSlug,
} from "@/lib/trade-location";
import {
  getPricingQuartiles,
  getNextAvailableSlots,
  getProvidersForLocation,
  getLocalRules,
  checkPageQuality,
} from "@/lib/programmatic-data";
import { JsonLd } from "@/components/seo/JsonLd";
import { serviceSchema } from "@/lib/seo/schema";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    trade: string;
    location: string;
  }>;
}

// Revalidate every 4 hours (ISR)
export const revalidate = 14400;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { trade: tradeSlug, location: locationSlug } = await params;
  const trade = getTradeFromSlug(tradeSlug);
  const location = parseLocationSlug(locationSlug);

  if (!trade) {
    return {
      title: "Page Not Found",
    };
  }

  const tradeName = TRADE_PLURAL_NAMES[trade];
  const quality = await checkPageQuality(trade, location);

  const title = `${tradeName} in ${location} | Need A Tradesman`;
  const description = `Find trusted ${tradeName.toLowerCase()} in ${location}. Compare quotes, check availability, and hire verified tradespeople. ${quality.providerCount}+ local professionals ready to help.`;

  return {
    title,
    description,
    // Set noindex if page doesn't meet quality threshold
    robots: quality.shouldPublish
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "en_GB",
    },
  };
}

export default async function TradeLocationPage({ params }: PageProps) {
  const { trade: tradeSlug, location: locationSlug } = await params;
  const trade = getTradeFromSlug(tradeSlug);
  const location = parseLocationSlug(locationSlug);

  if (!trade) {
    notFound();
  }

  // Fetch all data in parallel
  const [pricing, availability, providers, rules, quality] = await Promise.all([
    getPricingQuartiles(trade, location),
    getNextAvailableSlots(trade, location, 3),
    getProvidersForLocation(trade, location, 6),
    getLocalRules(trade, location),
    checkPageQuality(trade, location),
  ]);

  // If page doesn't meet quality threshold, still render but with noindex (set in metadata)
  const tradeName = TRADE_PLURAL_NAMES[trade];
  const tradeServiceName = TRADE_SERVICE_NAMES[trade];

  // Generate structured data
  const schema = serviceSchema({
    trade,
    location,
    priceRange: pricing
      ? `£${Math.round(pricing.q1)}-£${Math.round(pricing.q3)}`
      : undefined,
    priceUnit: pricing?.unit,
    areaServed: location,
    availability: availability.length > 0 ? "https://schema.org/InStock" : undefined,
    url: `https://needatradesman.com/${tradeSlug}/${locationSlug}`,
  });

  // Get related content for internal linking
  const nearbyAreas = getNearbyAreas(location);
  const relatedTrades = getRelatedTrades(trade);

  return (
    <>
      <JsonLd data={schema} />

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav className="mb-6 text-sm">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/" className="text-muted-foreground hover:text-foreground">
                Home
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li>
              <Link
                href={`/${tradeSlug}`}
                className="text-muted-foreground hover:text-foreground"
              >
                {tradeName}
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="font-medium">{location}</li>
          </ol>
        </nav>

        {/* Hero Section */}
        <section className="mb-12">
          <h1 className="text-4xl font-bold mb-4">
            {tradeName} in {location}
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Find trusted {tradeName.toLowerCase()} in {location}. Get quotes
            from verified local professionals.
          </p>
          <div className="flex gap-4">
            <Link
              href="/onboarding"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              Get Free Quotes
            </Link>
            <Link
              href="#providers"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-8 py-3 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
            >
              Browse {tradeName}
            </Link>
          </div>
        </section>

        {/* Price Range Card */}
        {pricing && (
          <section className="mb-12">
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-2xl font-semibold mb-4">
                Typical {tradeServiceName} Costs in {location}
              </h2>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Low</div>
                  <div className="text-2xl font-bold">
                    £{Math.round(pricing.q1)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Average</div>
                  <div className="text-2xl font-bold">
                    £{Math.round(pricing.q2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">High</div>
                  <div className="text-2xl font-bold">
                    £{Math.round(pricing.q3)}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Per {pricing.unit} • Based on {pricing.sampleSize} recent jobs
              </p>
            </div>
          </section>
        )}

        {/* Availability Widget */}
        {availability.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">
              Next Available Appointments
            </h2>
            <div className="grid gap-4 md:grid-cols-3">
              {availability.map((slot, index) => (
                <div key={index} className="rounded-lg border bg-card p-4">
                  <div className="font-medium">{slot.providerName}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {slot.date.toLocaleDateString("en-GB", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                  <div className="text-sm">
                    {slot.startTime} - {slot.endTime}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Providers List */}
        {providers.length > 0 && (
          <section id="providers" className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">
              Top {tradeName} in {location}
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <Link
                  key={provider.id}
                  href={`/providers/${provider.slug}`}
                  className="rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold mb-2">{provider.businessName}</h3>
                  {provider.averageRating && (
                    <div className="flex items-center gap-2 text-sm mb-2">
                      <span className="text-yellow-500">★</span>
                      <span className="font-medium">
                        {provider.averageRating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({provider.reviewCount} reviews)
                      </span>
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {provider.addressLocality}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Local Regulations Panel */}
        {rules.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-4">
              Regulations &amp; Safety
            </h2>
            <div className="space-y-4">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-lg border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded bg-primary/10 p-2 text-primary">
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{rule.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {rule.description}
                      </p>
                      {rule.reference && (
                        <a
                          href={rule.reference}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Learn more →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Internal Linking - Nearby Areas */}
        {nearbyAreas.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              {tradeName} in Nearby Areas
            </h2>
            <div className="flex flex-wrap gap-2">
              {nearbyAreas.map((area) => (
                <Link
                  key={area}
                  href={`/${tradeSlug}/${normalizeLocationSlug(area)}`}
                  className="rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {area}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Internal Linking - Related Trades */}
        {relatedTrades.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4">
              Related Services in {location}
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedTrades.map((relatedTrade) => (
                <Link
                  key={relatedTrade}
                  href={`/${getSlugFromTrade(relatedTrade)}/${locationSlug}`}
                  className="rounded-md border bg-background px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {TRADE_PLURAL_NAMES[relatedTrade]}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quality Warning (only visible if below threshold) */}
        {!quality.shouldPublish && (
          <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4 text-sm">
            <p className="text-yellow-800 dark:text-yellow-200">
              We&apos;re still gathering information about {tradeName.toLowerCase()} in{" "}
              {location}. Check back soon for more details, or post a job to get
              quotes from available professionals.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
