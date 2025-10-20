import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-gate";
import { prisma } from "@/lib/prisma";
import { createJobSchema, UserRole, JobCategory } from "@/lib/schemas";
import { createLogger } from "@/lib/logger";
import { PAGINATION } from "@/lib/constants";
import { validateSearchQuery } from "@/lib/utils";
import { unstable_cache, revalidateTag } from "next/cache";
import {
    redis,
    jobPostingRateLimit
} from "@/lib/redis";

const logger = createLogger("jobs-api");

export async function POST(request: NextRequest) {
    try {
        // Require authentication and CUSTOMER role
        const gate = await requireRole(UserRole.CUSTOMER);

        // Rate limiting for job posting (use clerkId to avoid reuse of internal IDs)
        if (jobPostingRateLimit) {
            try {
                const { success, limit, reset, remaining } = await jobPostingRateLimit.limit(gate.clerkId);

                if (!success) {
                    const resetDate = new Date(reset);
                    const retryAfter = Math.ceil((resetDate.getTime() - Date.now()) / 1000);

                    return new NextResponse(
                        `Rate limit exceeded. You can only post ${limit} jobs per hour. ${remaining} remaining.`,
                        {
                            status: 429,
                            headers: {
                                'X-RateLimit-Limit': String(limit),
                                'X-RateLimit-Remaining': String(remaining),
                                'X-RateLimit-Reset': String(reset),
                                'Retry-After': String(retryAfter),
                            }
                        }
                    );
                }
            } catch (error) {
                // This is a Redis connection error - log it and continue
                logger.error({ error }, 'Rate limiter error (likely Redis connection issue)');
                // Allow the request to proceed if rate limiting fails due to connection issues
            }
        }

        // Parse and validate request body
        const body = await request.json();
        const validatedData = createJobSchema.parse(body);

        // Extract location data from structured locationData if available
        const locationData = validatedData.locationData;

        // Server-side verification: verify Place ID with Google Places API
        if (locationData?.id) {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
            if (apiKey) {
                try {
                    // Use Places API (New) format: GET /v1/places/{PLACE_ID}
                    // Note: Don't include 'key' in URL, use X-Goog-Api-Key header instead
                    const verifyResponse = await fetch(
                        `https://places.googleapis.com/v1/places/${locationData.id}?fields=id,formattedAddress,location`,
                        {
                            headers: {
                                'X-Goog-Api-Key': apiKey,
                                'X-Goog-FieldMask': 'id,formattedAddress,location',
                            },
                        }
                    );

                    if (verifyResponse.ok) {
                        const placeDetails = await verifyResponse.json();
                        logger.debug({ placeId: locationData.id, verified: true }, 'Place ID verified successfully');

                        // Optionally: verify the coords match (within reasonable tolerance)
                        if (placeDetails.location) {
                            const latDiff = Math.abs(placeDetails.location.latitude - locationData.latitude);
                            const lngDiff = Math.abs(placeDetails.location.longitude - locationData.longitude);
                            if (latDiff > 0.01 || lngDiff > 0.01) {
                                logger.warn({
                                    placeId: locationData.id,
                                    providedLat: locationData.latitude,
                                    providedLng: locationData.longitude,
                                    verifiedLat: placeDetails.location.latitude,
                                    verifiedLng: placeDetails.location.longitude,
                                }, 'Location coordinates mismatch');
                                // Log but don't reject - small differences are acceptable
                            }
                        }
                    } else {
                        const errorText = await verifyResponse.text();
                        logger.warn({
                            placeId: locationData.id,
                            status: verifyResponse.status,
                            error: errorText
                        }, 'Place ID verification failed');
                        // Don't fail the request - log and continue
                        // The client-side already validated this is a real Place
                    }
                } catch (error) {
                    logger.error({ error, placeId: locationData.id }, 'Error verifying Place ID');
                    // Don't fail the request if verification fails due to network issues
                    // but log it for monitoring
                }
            }
        }

        // Always persist a non-empty location string for legacy search/display
        const locationString: string =
            (locationData?.displayText || locationData?.formattedAddress || validatedData.location || "").trim();

        // Create job in database
        const job = await prisma.job.create({
            data: {
                title: validatedData.title,
                description: validatedData.description,
                category: validatedData.category,
                location: locationString,
                placeId: locationData?.id, // Store Place ID for validation and future verification
                latitude: locationData?.latitude,
                longitude: locationData?.longitude,
                formattedAddress: locationData?.formattedAddress,
                city: locationData?.city,
                postcode: locationData?.postcode,
                budget: validatedData.budget,
                attachments: validatedData.attachments ? JSON.stringify(validatedData.attachments) : null,
                customerId: gate.userId,
                status: "OPEN",
            },
        });

        // Invalidate job feed caches when a new job is created
        if (redis) {
            try {
                revalidateTag('jobs');
                revalidateTag(`user-stats-${gate.userId}`);
                logger.debug('Invalidated job feed caches and user stats after job creation');
            } catch (cacheError) {
                logger.error({ error: cacheError }, 'Cache invalidation error');
                // Don't fail the request if cache invalidation fails
            }
        }

        return NextResponse.json(job, { status: 201 });
    } catch (error) {
        logger.error({ error }, 'Error creating job');

        if (error instanceof Error && error.name === "ZodError") {
            return new NextResponse("Invalid request data", { status: 400 });
        }

        return new NextResponse("Internal server error", { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        // Get all open jobs for public viewing (tradespeople)
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const rawLocation = searchParams.get("location");
        const rawSearch = searchParams.get("search");
        const page = Number.parseInt(searchParams.get("page") || "1");

        // Allow limit override via query param with validation (between MIN and MAX)
        const requestedLimit = Number.parseInt(searchParams.get("limit") || String(PAGINATION.JOBS_PER_PAGE));
        const limit = Math.min(Math.max(requestedLimit, PAGINATION.MIN_JOBS_PER_PAGE), PAGINATION.MAX_JOBS_PER_PAGE);

        // Validate and sanitize search query
        let search: string | null = null;
        try {
            search = validateSearchQuery(rawSearch);
        } catch (error) {
            if (error instanceof Error) {
                return new NextResponse(error.message, { status: 400 });
            }
            return new NextResponse("Invalid search query", { status: 400 });
        }

        // Validate and sanitize location query
        let location: string | null = null;
        try {
            location = validateSearchQuery(rawLocation);
        } catch (error) {
            if (error instanceof Error) {
                return new NextResponse(error.message, { status: 400 });
            }
            return new NextResponse("Invalid location query", { status: 400 });
        }

        // Use unstable_cache for caching with Next.js
        const getJobsList = unstable_cache(
            async (filterParams: {
                category: string | null;
                location: string | null;
                search: string | null;
                page: number;
                limit: number;
            }) => {
                // Build where clause for database query
                const where = {
                    status: "OPEN" as const,
                    ...(filterParams.category && { category: filterParams.category as JobCategory }),
                    ...(filterParams.location && {
                        OR: [
                            {
                                location: {
                                    contains: filterParams.location,
                                    mode: "insensitive" as const,
                                }
                            },
                            {
                                postcode: {
                                    contains: filterParams.location,
                                    mode: "insensitive" as const,
                                }
                            },
                            {
                                city: {
                                    contains: filterParams.location,
                                    mode: "insensitive" as const,
                                }
                            }
                        ]
                    }),
                    ...(filterParams.search && {
                        OR: [
                            {
                                title: {
                                    contains: filterParams.search,
                                    mode: "insensitive" as const,
                                }
                            },
                            {
                                description: {
                                    contains: filterParams.search,
                                    mode: "insensitive" as const,
                                }
                            }
                        ]
                    }),
                };

                // Get total count for pagination
                const [jobs, totalCount] = await Promise.all([
                    prisma.job.findMany({
                        where,
                        include: {
                            customer: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                            _count: {
                                select: {
                                    applications: true,
                                },
                            },
                        },
                        orderBy: {
                            createdAt: "desc",
                        },
                        skip: (filterParams.page - 1) * filterParams.limit,
                        take: filterParams.limit,
                    }),
                    prisma.job.count({ where })
                ]);

                return {
                    jobs,
                    pagination: {
                        page: filterParams.page,
                        limit: filterParams.limit,
                        total: totalCount,
                        pages: Math.ceil(totalCount / filterParams.limit),
                        hasMore: filterParams.page * filterParams.limit < totalCount
                    }
                };
            },
            ['jobs', category || 'no-category', location || 'no-location', search || 'no-search', String(page), String(limit)],
            {
                revalidate: 180, // 3 minutes for real-time feel
                tags: ['jobs']
            }
        );

        const response = await getJobsList({
            category,
            location,
            search,
            page,
            limit
        });

        return NextResponse.json(response, {
            headers: {
                'X-Pagination-Page': String(page),
                'X-Pagination-Limit': String(limit),
                'X-Pagination-Total': String(response.pagination.total),
                'X-Pagination-Pages': String(response.pagination.pages),
            }
        });
    } catch (error) {
        logger.error({ error }, 'Error fetching jobs');
        return new NextResponse("Internal server error", { status: 500 });
    }
}
