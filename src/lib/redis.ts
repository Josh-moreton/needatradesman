import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';

const isStandardRedisConfigured = !!process.env.REDIS_URL;

let redis: Redis | null = null;

if (isStandardRedisConfigured) {
    redis = new Redis(process.env.REDIS_URL!);
}

export { redis };

// Rate limiting for job posting
export const jobPostingRateLimit = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:jobPosting',
        points: 3, // 3 jobs
        duration: 3600, // per hour
    })
    : null;

// Rate limiting for applications
export const applicationRateLimit = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:application',
        points: 10, // 10 applications
        duration: 3600, // per hour
    })
    : null;

// Rate limiting for messages
export const messageRateLimit = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: 'rl:message',
        points: 50, // 50 messages
        duration: 3600, // per hour
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
        await redis.set(cacheKey, JSON.stringify(data), 'EX', CACHE_TTL.USER_STATS);
        console.log('Cached user stats:', cacheKey);
    } catch (error) {
        console.error('Error caching user stats:', error);
    }
};

export const getCachedUserStats = async (userId: string, role: string) => {
    if (!redis) return null;

    try {
        const cacheKey = CACHE_KEYS.USER_STATS(userId, role);
        const cached = await redis.get(cacheKey);
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
        await redis.set(key, JSON.stringify(data), 'EX', ttl);
        console.log('Cached jobs list:', key);
    } catch (error) {
        console.error('Error caching jobs list:', error);
    }
};

export const getCachedJobsList = async (key: string) => {
    if (!redis) return null;

    try {
        const cached = await redis.get(key);
        if (cached) {
            console.log('Cache hit for jobs list:', key);
            return cached;
        }
    } catch (error) {
        console.error('Error getting cached jobs list:', error);
    }
    return null;
};
