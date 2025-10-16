import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Check if Redis is configured (Upstash provides these via Vercel integration)
const isRedisConfigured = !!process.env.REDIS_URL || (!!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN);

let redis: Redis | null = null;

if (isRedisConfigured) {
    try {
        console.log('Initializing Upstash Redis...');

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

        console.log('Upstash Redis initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Upstash Redis:', error);
        redis = null;
    }
} else {
    console.warn('Redis not configured - Redis features disabled (no REDIS_URL or KV credentials found)');
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
        limiter: Ratelimit.slidingWindow(50, '1 h'), // 50 requests per hour
        prefix: 'rl:message',
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
        categories.forEach(category => {
            commonCacheKeys.push(`jobs:list:${category}:all:all:1`);
            commonCacheKeys.push(`jobs:list:${category}:all:all:2`);
        });

        // Delete all common cache keys
        await Promise.all(commonCacheKeys.map(key => redis!.del(key)));

        console.log('Invalidated job list caches:', commonCacheKeys.length, 'keys');
    } catch (error) {
        console.error('Error invalidating job caches:', error);
    }
};

export const invalidateApplicationCaches = async (userId: string, role: string) => {
    if (!redis) return;

    try {
        const cacheKey = CACHE_KEYS.USER_APPLICATIONS(userId, role);
        await redis.del(cacheKey);
        console.log('Invalidated application cache for user:', userId);
    } catch (error) {
        console.error('Error invalidating application cache:', error);
    }
};

export const invalidateJobDetailCache = async (jobId: string) => {
    if (!redis) return;

    try {
        const cacheKey = CACHE_KEYS.JOB_DETAIL(jobId);
        await redis.del(cacheKey);
        console.log('Invalidated job detail cache:', jobId);
    } catch (error) {
        console.error('Error invalidating job detail cache:', error);
    }
};

export const cacheUserStats = async (userId: string, role: string, data: unknown) => {
    if (!redis) return;

    try {
        const cacheKey = CACHE_KEYS.USER_STATS(userId, role);
        await redis.set(cacheKey, JSON.stringify(data), { ex: CACHE_TTL.USER_STATS });
        console.log('Cached user stats:', cacheKey);
    } catch (error) {
        console.error('Error caching user stats:', error);
    }
};

export const getCachedUserStats = async (userId: string, role: string) => {
    if (!redis) return null;

    try {
        const cacheKey = CACHE_KEYS.USER_STATS(userId, role);
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
            console.log('Cache hit for user stats:', cacheKey);
            return cached;
        }
    } catch (error) {
        console.error('Error getting cached user stats:', error);
    }
    return null;
};

export const invalidateUserStats = async (userId: string, role: string) => {
    if (!redis) return;

    try {
        const cacheKey = CACHE_KEYS.USER_STATS(userId, role);
        await redis.del(cacheKey);
        console.log('Invalidated user stats cache:', userId);
    } catch (error) {
        console.error('Error invalidating user stats cache:', error);
    }
};

export const cacheJobsList = async (key: string, data: unknown, ttl: number = CACHE_TTL.JOBS_LIST) => {
    if (!redis) return;

    try {
        await redis.set(key, JSON.stringify(data), { ex: ttl });
        console.log('Cached jobs list:', key);
    } catch (error) {
        console.error('Error caching jobs list:', error);
    }
};

export const getCachedJobsList = async (key: string) => {
    if (!redis) return null;

    try {
        const cached = await redis.get<string>(key);
        if (cached) {
            console.log('Cache hit for jobs list:', key);
            return cached;
        }
    } catch (error) {
        console.error('Error getting cached jobs list:', error);
    }
    return null;
};
