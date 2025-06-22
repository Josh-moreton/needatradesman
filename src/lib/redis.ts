import { Redis as UpstashRedis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import Redis from 'ioredis'

// Check if Redis is configured
const isUpstashConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const isStandardRedisConfigured = !!process.env.REDIS_URL;

let redis: UpstashRedis | null = null;
let standardRedis: Redis | null = null;

if (isUpstashConfigured) {
    // Use Upstash Redis
    redis = new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
} else if (isStandardRedisConfigured) {
    // Use standard Redis with ioredis client
    standardRedis = new Redis(process.env.REDIS_URL!);

    // Create an Upstash-compatible wrapper for rate limiting
    redis = {
        async get(key: string) {
            const result = await standardRedis!.get(key);
            return result ? JSON.parse(result) : null;
        },
        async set(key: string, value: any, options?: { ex?: number }) {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (options?.ex) {
                return await standardRedis!.setex(key, options.ex, stringValue);
            }
            return await standardRedis!.set(key, stringValue);
        },
        async del(key: string) {
            return await standardRedis!.del(key);
        },
        async lpush(key: string, value: string) {
            return await standardRedis!.lpush(key, value);
        },
        async expire(key: string, seconds: number) {
            return await standardRedis!.expire(key, seconds);
        },
        async publish(channel: string, message: string) {
            return await standardRedis!.publish(channel, message);
        },
    } as any;
}

export { redis, standardRedis };

// Rate limiting for job posting
export const jobPostingRateLimit = redis ? new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 jobs per hour
    analytics: true,
}) : null;

// Rate limiting for applications
export const applicationRateLimit = redis ? new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 applications per hour
    analytics: true,
}) : null;

// Rate limiting for messages
export const messageRateLimit = redis ? new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(50, '1 h'), // 50 messages per hour
    analytics: true,
}) : null;

// Cache utilities
export const CACHE_KEYS = {
    JOBS_LIST: (userId: string, filters?: string) => `jobs:list:${userId}:${filters || 'all'}`,
    JOB_DETAIL: (jobId: string) => `job:detail:${jobId}`,
    USER_CONVERSATIONS: (userId: string) => `conversations:${userId}`,
    CHAT_MESSAGES: (jobId: string, participants: string) => `chat:${jobId}:${participants}`,
} as const;

export const CACHE_TTL = {
    JOBS_LIST: 300, // 5 minutes
    JOB_DETAIL: 600, // 10 minutes
    CONVERSATIONS: 60, // 1 minute
    MESSAGES: 3600, // 1 hour
} as const;
