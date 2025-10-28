import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { createLogger } from './logger';

const logger = createLogger('redis');

// Check if Redis is configured (Upstash provides these via Vercel integration)
const isRedisConfigured = !!process.env.REDIS_URL || (!!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN);

const createRedisInstance = (): Redis | null => {
    if (!isRedisConfigured) {
        logger.warn('Redis not configured - Redis features disabled (no REDIS_URL or KV credentials found)');
        return null;
    }

    try {
        logger.info('Initializing Upstash Redis...');

        // Upstash Redis can be initialized in two ways:
        // 1. Using REDIS_URL (if using standard Upstash Redis)
        // 2. Using KV_REST_API_URL and KV_REST_API_TOKEN (if using Vercel KV)
        let instance: Redis | null = null;
        if (process.env.REDIS_URL) {
            instance = Redis.fromEnv();
        } else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
            instance = new Redis({
                url: process.env.KV_REST_API_URL,
                token: process.env.KV_REST_API_TOKEN,
            });
        }

        logger.info('Upstash Redis initialized successfully');
        return instance;
    } catch (error) {
        logger.error({ error }, 'Failed to initialize Upstash Redis');
        return null;
    }
};

const redis = createRedisInstance();

export { redis };

// Rate limiting using Upstash Ratelimit
// Uses a sliding window algorithm for accurate rate limiting
export const jobPostingRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 requests per hour
        prefix: 'rl:jobPosting',
        analytics: true,
    })
    : null;

export const applicationRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 requests per hour
        prefix: 'rl:application',
        analytics: true,
    })
    : null;

export const messageRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '5 m'), // 100 requests per 5 minutes
        prefix: 'rl:message',
        analytics: true,
    })
    : null;

export const webhookRateLimit = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
        prefix: 'rl:webhook',
        analytics: true,
    })
    : null;

// Cache utilities
export const CACHE_KEYS = {
    JOBS_LIST: (filters?: string) => `jobs:list:${filters || 'all'}`,
    JOB_DETAIL: (jobId: string) => `job:detail:${jobId}`,
    USER_CONVERSATIONS: (userId: string) => `conversations:${userId}`,
    CHAT_MESSAGES: (jobId: string, participants: string) => `chat:${jobId}:${participants}`,
    USER_APPLICATIONS: (userId: string, role: string) => `applications:${role}:${userId}`,
    USER_STATS: (userId: string, role: string) => `stats:${role}:${userId}`,
} as const;

export const CACHE_TTL = {
    JOBS_LIST: 180, // 3 minutes for real-time feel
    JOB_DETAIL: 300, // 5 minutes
    CONVERSATIONS: 60, // 1 minute
    MESSAGES: 3600, // 1 hour
    APPLICATIONS: 180, // 3 minutes for real-time updates
    USER_STATS: 300, // 5 minutes
} as const;

// Helper functions for cache management
export const invalidateJobCaches = async () => {
    if (!redis) return;

    try {
        // Invalidate common job list cache patterns
        const commonCacheKeys = [
            'jobs:list:all:all:all:1',
            'jobs:list:all:all:all:2',
            'jobs:list:all:all:all:3',
            'jobs:list:all',
        ];

        // Add category-specific cache keys (common categories)
        const categories = ['ELECTRICAL', 'PLUMBING', 'CARPENTRY', 'PAINTING', 'GARDENING', 'GENERAL'];
        for (const category of categories) {
            commonCacheKeys.push(
                `jobs:list:${category}:all:all:1`,
                `jobs:list:${category}:all:all:2`
            );
        }

        // Delete all common cache keys
        await Promise.all(commonCacheKeys.map(key => redis!.del(key)));

        logger.debug({ keyCount: commonCacheKeys.length }, 'Invalidated job list caches');
    } catch (error) {
        logger.error({ error }, 'Error invalidating job caches');
    }
};

export const invalidateApplicationCaches = async (userId: string, role: string) => {
    if (!redis) return;

    try {
        const cacheKey = CACHE_KEYS.USER_APPLICATIONS(userId, role);
        await redis.del(cacheKey);
        logger.debug({ userId }, 'Invalidated application cache');
    } catch (error) {
        logger.error({ error }, 'Error invalidating application cache');
    }
};

export const invalidateJobDetailCache = async (jobId: string) => {
    if (!redis) return;

    try {
        const cacheKey = CACHE_KEYS.JOB_DETAIL(jobId);
        await redis.del(cacheKey);
        logger.debug({ jobId }, 'Invalidated job detail cache');
    } catch (error) {
        logger.error({ error }, 'Error invalidating job detail cache');
    }
};

export const cacheUserStats = async (userId: string, role: string, data: unknown) => {
    if (!redis) return;

    try {
        const cacheKey = CACHE_KEYS.USER_STATS(userId, role);
        await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL.USER_STATS });
        logger.debug({ cacheKey }, 'Cached user stats');
    } catch (error) {
        logger.error({ error }, 'Error caching user stats');
    }
};

export const getCachedUserStats = async (userId: string, role: string) => {
    if (!redis) return null;

    try {
        const cacheKey = CACHE_KEYS.USER_STATS(userId, role);
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
            logger.debug({ cacheKey }, 'Cache hit for user stats');
            return cached;
        }
    } catch (error) {
        logger.error({ error }, 'Error getting cached user stats');
    }
    return null;
};

export const invalidateUserStats = async (userId: string, role: string) => {
    if (!redis) return;

    try {
        const cacheKey = CACHE_KEYS.USER_STATS(userId, role);
        await redis.del(cacheKey);
        logger.debug({ userId }, 'Invalidated user stats cache');
    } catch (error) {
        logger.error({ error }, 'Error invalidating user stats cache');
    }
};

export const cacheJobsList = async (key: string, data: unknown, ttl: number = CACHE_TTL.JOBS_LIST) => {
    if (!redis) return;

    try {
        await redis.set(key, JSON.stringify(data), { ex: ttl });
        logger.debug({ key }, 'Cached jobs list');
    } catch (error) {
        logger.error({ error }, 'Error caching jobs list');
    }
};

export const getCachedJobsList = async (key: string) => {
    if (!redis) return null;

    try {
        const cached = await redis.get<string>(key);
        if (cached) {
            logger.debug({ key }, 'Cache hit for jobs list');
            return cached;
        }
    } catch (error) {
        logger.error({ error }, 'Error getting cached jobs list');
    }
    return null;
};

// Webhook security and idempotency helpers
const WEBHOOK_FAILURE_THRESHOLD = 10;
const WEBHOOK_FAILURE_WINDOW = 300; // 5 minutes

/**
 * Track webhook signature verification failures
 * @param identifier - IP address or other identifier
 * @returns The current failure count
 */
export async function trackWebhookFailure(identifier: string): Promise<number> {
    if (!redis) return 0;

    try {
        const key = `webhook:failures:${identifier}`;
        const failures = await redis.incr(key);

        // Set expiry on first increment
        if (failures === 1) {
            await redis.expire(key, WEBHOOK_FAILURE_WINDOW);
        }

        return failures;
    } catch (error) {
        logger.error({ error, identifier }, 'Error tracking webhook failure');
        return 0;
    }
}

/**
 * Check if webhook failure threshold has been exceeded
 * @param failureCount - Number of failures
 * @returns true if threshold exceeded
 */
export function isWebhookFailureThresholdExceeded(failureCount: number): boolean {
    return failureCount > WEBHOOK_FAILURE_THRESHOLD;
}

/**
 * Check if a webhook event has already been processed
 * @param eventId - The Stripe event ID
 * @returns true if already processed, false otherwise
 */
export async function isWebhookProcessed(eventId: string): Promise<boolean> {
    if (!redis) return false;
    try {
        const eventKey = `webhook:processed:${eventId}`;
        const result = await redis.get<string>(eventKey);
        return result !== null;
    } catch (error) {
        logger.error({ error, eventId }, 'Error checking webhook processed status');
        return false;
    }
}

/**
 * Mark a webhook event as processed
 * @param eventId - The Stripe event ID
 * @param ttlSeconds - Time to live in seconds (default: 24 hours)
 * @returns true if successful, false otherwise
 */
export async function markWebhookProcessed(eventId: string, ttlSeconds: number = 86400): Promise<boolean> {
    if (!redis) return false;
    try {
        const eventKey = `webhook:processed:${eventId}`;
        await redis.set(eventKey, '1', { ex: ttlSeconds });
        logger.debug({ eventId, ttlSeconds }, 'Marked webhook as processed');
        return true;
    } catch (error) {
        logger.error({ error, eventId }, 'Error marking webhook as processed');
        return false;
    }
}
