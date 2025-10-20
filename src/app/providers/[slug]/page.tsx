/**
 * Provider profile page template
 * URL: /providers/[slug] e.g., /providers/morningside-electrical
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/seo/JsonLd";
import { providerSchema } from "@/lib/seo/schema";
import {
  getProviderBySlug,
  getProviderReviews,
  isProviderComplete,
} from "@/lib/programmatic-data";
import { TRADE_PLURAL_NAMES } from "@/lib/trade-location";
import Link from "next/link";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// Revalidate every 2 hours (ISR)
export const revalidate = 7200;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    return {
      title: "Provider Not Found",
    };
  }

  const isComplete = isProviderComplete(provider);
  const title = `${provider.businessName} | Need A Tradesman`;
  const description =
    provider.description ||
    `${provider.businessName} - Trusted tradesperson in ${provider.addressLocality || "your area"}. ${provider.reviewCount > 0 ? `${provider.reviewCount} verified reviews.` : ""}`;

  return {
    title,
    description,
    // Set noindex if profile is incomplete, but keep follow for link equity
    robots:
      provider.isPublished && isComplete
        ? { index: true, follow: true }
        : { index: false, follow: true },
    openGraph: {
      title,
      description,
      type: "profile",
      locale: "en_GB",
      images: provider.logo ? [{ url: provider.logo }] : undefined,
    },
  };
}

export default async function ProviderPage({ params }: PageProps) {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);

  if (!provider) {
    notFound();
  }

  const isComplete = isProviderComplete(provider);
  const reviews = await getProviderReviews(provider.id, 10);

  // Generate structured data - only include reviews ABOUT the provider
  const schema = providerSchema({
    name: provider.businessName,
    address: provider.address
      ? {
          streetAddress: provider.address,
          addressLocality: provider.addressLocality || undefined,
          addressRegion: provider.addressRegion || undefined,
          postalCode: provider.postalCode || undefined,
          addressCountry: "GB",
        }
      : undefined,
    telephone: provider.telephone || undefined,
    email: provider.email || undefined,
    url: `https://needatradesman.com/providers/${slug}`,
    geo:
      provider.latitude && provider.longitude
        ? {
            latitude: provider.latitude,
            longitude: provider.longitude,
          }
        : undefined,
    areaServed: provider.serviceAreas,
    priceRange: provider.averageRating && provider.averageRating >= 4 ? "££-£££" : "££",
    image: provider.logo || undefined,
    reviews: reviews.map((r) => ({
      "@type": "Review" as const,
      author: {
        "@type": "Person" as const,
        name: r.customerName,
      },
      reviewRating: {
        "@type": "Rating" as const,
        ratingValue: r.rating,
        bestRating: 5,
      },
      reviewBody: r.reviewText || undefined,
      datePublished: r.createdAt.toISOString(),
    })),
    aggregateRating:
      provider.reviewCount > 0 && provider.averageRating
        ? {
            ratingValue: provider.averageRating,
            reviewCount: provider.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  });

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
                href="/providers"
                className="text-muted-foreground hover:text-foreground"
              >
                Providers
              </Link>
            </li>
            <li className="text-muted-foreground">/</li>
            <li className="font-medium">{provider.businessName}</li>
          </ol>
        </nav>

        {/* Cover Image */}
        {provider.coverImage && (
          <div className="mb-8 rounded-lg overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={provider.coverImage}
              alt={`${provider.businessName} cover`}
              className="w-full h-48 object-cover"
            />
          </div>
        )}

        {/* Header Section */}
        <section className="mb-8">
          <div className="flex items-start gap-6">
            {provider.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={provider.logo}
                alt={`${provider.businessName} logo`}
                className="w-24 h-24 rounded-lg object-cover border"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{provider.businessName}</h1>
              <div className="flex items-center gap-4 mb-4">
                {provider.averageRating && provider.reviewCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500 text-xl">★</span>
                    <span className="font-semibold text-lg">
                      {provider.averageRating.toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({provider.reviewCount} reviews)
                    </span>
                  </div>
                )}
                {provider.addressLocality && (
                  <span className="text-muted-foreground">
                    📍 {provider.addressLocality}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                {provider.telephone && (
                  <a
                    href={`tel:${provider.telephone}`}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                  >
                    Call Now
                  </a>
                )}
                <Link
                  href="/onboarding"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
                >
                  Get a Quote
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Incomplete Warning */}
        {!isComplete && (
          <div className="mb-8 rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              This profile is still being set up. Some information may be incomplete.
            </p>
          </div>
        )}

        {/* Services */}
        {provider.trades.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Services</h2>
            <div className="flex flex-wrap gap-2">
              {provider.trades.map((trade) => (
                <span
                  key={trade}
                  className="rounded-md bg-primary/10 px-3 py-1 text-sm font-medium"
                >
                  {TRADE_PLURAL_NAMES[trade]}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* About */}
        {provider.description && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">About</h2>
            <p className="text-muted-foreground">{provider.description}</p>
          </section>
        )}

        {/* Service Areas */}
        {provider.serviceAreas.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Service Areas</h2>
            <div className="flex flex-wrap gap-2">
              {provider.serviceAreas.map((area) => (
                <span
                  key={area}
                  className="rounded-md border bg-background px-3 py-1 text-sm"
                >
                  {area}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Contact & Hours */}
        <section className="mb-8">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Contact Information */}
            <div className="rounded-lg border bg-card p-6">
              <h2 className="text-xl font-semibold mb-4">Contact</h2>
              <div className="space-y-3">
                {provider.telephone && (
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                      />
                    </svg>
                    <a
                      href={`tel:${provider.telephone}`}
                      className="text-primary hover:underline"
                    >
                      {provider.telephone}
                    </a>
                  </div>
                )}
                {provider.email && (
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    <a
                      href={`mailto:${provider.email}`}
                      className="text-primary hover:underline"
                    >
                      {provider.email}
                    </a>
                  </div>
                )}
                {provider.website && (
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Visit Website
                    </a>
                  </div>
                )}
                {provider.address && (
                  <div className="flex items-start gap-3">
                    <svg
                      className="h-5 w-5 text-muted-foreground mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="text-sm">
                      {provider.address}
                      {provider.addressLocality && `, ${provider.addressLocality}`}
                      {provider.postalCode && ` ${provider.postalCode}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Accreditations */}
            {provider.accreditations.length > 0 && (
              <div className="rounded-lg border bg-card p-6">
                <h2 className="text-xl font-semibold mb-4">Accreditations</h2>
                <div className="space-y-2">
                  {provider.accreditations.map((acc) => (
                    <div key={acc} className="flex items-center gap-2">
                      <svg
                        className="h-5 w-5 text-green-500"
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
                      <span>{acc}</span>
                    </div>
                  ))}
                  {provider.gaseSafeNumber && (
                    <div className="text-sm text-muted-foreground">
                      Gas Safe: {provider.gaseSafeNumber}
                    </div>
                  )}
                  {provider.niceicNumber && (
                    <div className="text-sm text-muted-foreground">
                      NICEIC: {provider.niceicNumber}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Reviews */}
        {reviews.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Reviews</h2>
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="rounded-lg border bg-card p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-medium">{review.customerName}</div>
                      <div className="flex items-center gap-1 mt-1">
                        {Array.from({ length: review.rating }).map((_, i) => (
                          <span key={i} className="text-yellow-500">
                            ★
                          </span>
                        ))}
                        {Array.from({ length: 5 - review.rating }).map((_, i) => (
                          <span key={i} className="text-gray-300">
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {review.createdAt.toLocaleDateString("en-GB")}
                      {review.isVerified && (
                        <span className="ml-2 text-green-600">✓ Verified</span>
                      )}
                    </div>
                  </div>
                  {review.reviewText && (
                    <p className="text-muted-foreground">{review.reviewText}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Activity Stats */}
        <section className="mb-8">
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Activity & Performance</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Jobs Completed</div>
                <div className="text-2xl font-bold">{provider.jobsCompleted}</div>
              </div>
              {provider.responseTimeHours && (
                <div>
                  <div className="text-sm text-muted-foreground">
                    Avg Response Time
                  </div>
                  <div className="text-2xl font-bold">
                    {provider.responseTimeHours}h
                  </div>
                </div>
              )}
            </div>
            {provider.lastActive && (
              <p className="text-sm text-muted-foreground mt-4">
                Last active:{" "}
                {provider.lastActive.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
