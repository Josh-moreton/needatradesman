import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { createLogger } from './logger';

const logger = createLogger('redis');

// Check if Redis is configured (Upstash provides these via Vercel integration)
const isRedisConfigured = !!process.env.REDIS_URL || (!!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN);

let redis: Redis | null = null;

if (isRedisConfigured) {
    try {
        logger.info('Initializing Upstash Redis...');

        // Upstash Redis can be initialized in two ways:
        // 1. Using REDIS_URL (if using standard Upstash Redis)
        // 2. Using KV_REST_API_URL and KV_REST_API_TOKEN (if using Vercel KV)
        if (process.env.REDIS_URL) {
            redis = Redis.fromEnv();
        } else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
            redis = new Redis({
                url: process.env.KV_REST_API_URL,
                token: process.env.KV_REST_API_TOKEN,
            });
        }

        logger.info('Upstash Redis initialized successfully');
    } catch (error) {
        logger.error({ error }, 'Failed to initialize Upstash Redis');
        redis = null;
    }
} else {
    logger.warn('Redis not configured - Redis features disabled (no REDIS_URL or KV credentials found)');
}

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

// Safe wrapper functions for Redis operations
// These provide consistent error handling and logging for all Redis operations

/**
 * Safely get a value from Redis
 * @param key - The Redis key
 * @returns The value or null if error or not found
 */
export async function safeRedisGet<T>(key: string): Promise<T | null> {
    if (!redis) return null;
    try {
        return await redis.get<T>(key);
    } catch (error) {
        logger.error({ error, key }, 'Redis GET error');
        return null;
    }
}

/**
 * Safely set a value in Redis with expiry
 * @param key - The Redis key
 * @param value - The value to set
 * @param expirySeconds - Expiry time in seconds (optional)
 * @returns true if successful, false otherwise
 */
export async function safeRedisSet(
    key: string,
    value: string | number | boolean | object,
    expirySeconds?: number
): Promise<boolean> {
    if (!redis) return false;
    try {
        if (expirySeconds !== undefined) {
            await redis.set(key, value, { ex: expirySeconds });
        } else {
            await redis.set(key, value);
        }
        return true;
    } catch (error) {
        logger.error({ error, key }, 'Redis SET error');
        return false;
    }
}

/**
 * Safely delete one or more keys from Redis
 * @param keys - The Redis key(s) to delete
 * @returns true if successful, false otherwise
 */
export async function safeRedisDel(...keys: string[]): Promise<boolean> {
    if (!redis) return false;
    try {
        if (keys.length === 1) {
            await redis.del(keys[0]);
        } else {
            await Promise.all(keys.map(key => redis!.del(key)));
        }
        return true;
    } catch (error) {
        logger.error({ error, keys }, 'Redis DEL error');
        return false;
    }
}

/**
 * Safely push values to a Redis list
 * @param key - The Redis key
 * @param values - The values to push
 * @returns true if successful, false otherwise
 */
export async function safeRedisLpush(key: string, ...values: (string | number)[]): Promise<boolean> {
    if (!redis) return false;
    try {
        await redis.lpush(key, ...values);
        return true;
    } catch (error) {
        logger.error({ error, key }, 'Redis LPUSH error');
        return false;
    }
}

/**
 * Safely set expiry on a Redis key
 * @param key - The Redis key
 * @param seconds - Expiry time in seconds
 * @returns true if successful, false otherwise
 */
export async function safeRedisExpire(key: string, seconds: number): Promise<boolean> {
    if (!redis) return false;
    try {
        await redis.expire(key, seconds);
        return true;
    } catch (error) {
        logger.error({ error, key, seconds }, 'Redis EXPIRE error');
        return false;
    }
}

/**
 * Safely publish a message to a Redis channel
 * @param channel - The channel name
 * @param message - The message to publish
 * @returns true if successful, false otherwise
 */
export async function safeRedisPublish(channel: string, message: string): Promise<boolean> {
    if (!redis) return false;
    try {
        await redis.publish(channel, message);
        return true;
    } catch (error) {
        logger.error({ error, channel }, 'Redis PUBLISH error');
        return false;
    }
}

/**
 * Check if Redis is connected and healthy
 * @returns true if connected, false otherwise
 */
export async function isRedisHealthy(): Promise<boolean> {
    if (!redis) return false;
    try {
        const testKey = `health:check:${Date.now()}`;
        await redis.set(testKey, 'ok', { ex: 5 });
        const result = await redis.get<string>(testKey);
        await redis.del(testKey);
        return result === 'ok';
    } catch (error) {
        logger.error({ error }, 'Redis health check failed');
        return false;
    }
}

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
