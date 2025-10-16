# Redis Error Handling Documentation

## Overview

This document describes the comprehensive Redis error handling improvements implemented to ensure application reliability even when Redis encounters issues.

## Problem Statement

Previously, some Redis operations lacked consistent error handling, which could cause the application to fail when Redis was unavailable or encountering errors. This was particularly problematic in production environments where Redis connectivity issues should not bring down the entire application.

## Solution

We implemented a multi-layered approach to Redis error handling:

### 1. Safe Wrapper Functions

Created reusable wrapper functions in `src/lib/redis.ts` that provide consistent error handling:

```typescript
// Example usage:
const value = await safeRedisGet<string>('my-key');
// Returns null on error instead of throwing

const success = await safeRedisSet('my-key', 'value', 60);
// Returns boolean indicating success/failure
```

#### Available Wrapper Functions:

| Function | Purpose | Return on Error |
|----------|---------|-----------------|
| `safeRedisGet<T>(key)` | Get a value from Redis | `null` |
| `safeRedisSet(key, value, expiry?)` | Set a value with optional expiry | `false` |
| `safeRedisDel(...keys)` | Delete one or more keys | `false` |
| `safeRedisLpush(key, ...values)` | Push to a Redis list | `false` |
| `safeRedisExpire(key, seconds)` | Set key expiration | `false` |
| `safeRedisPublish(channel, message)` | Publish to a channel | `false` |
| `isRedisHealthy()` | Check Redis connectivity | `false` |

### 2. Consistent Try-Catch Patterns

All Redis operations are wrapped in try-catch blocks with proper error logging:

```typescript
if (redis) {
    try {
        const cached = await redis.get<string>(cacheKey);
        if (cached) {
            console.log('Cache hit:', cacheKey);
            return NextResponse.json(JSON.parse(cached));
        }
    } catch (cacheError) {
        console.error('Cache read error:', cacheError);
        // Continue to fetch from database
    }
}
```

### 3. Graceful Degradation

The application continues to function normally even when Redis is unavailable:

- **Cache misses** → Data fetched from database
- **Rate limiting failures** → Requests proceed without rate limiting
- **Cache invalidation failures** → Logged but don't block operations
- **Pub/sub failures** → Messages still saved to database

## Implementation Details

### Files Modified

1. **`src/lib/redis.ts`**
   - Added 7 new safe wrapper functions
   - Added `isRedisHealthy()` health check function
   - Existing helper functions already had try-catch blocks

2. **`src/app/api/messages/route.ts`**
   - Added try-catch around Redis operations in POST method
   - Operations: `lpush`, `expire`, `publish`, `del`

### Files Verified (Already Had Proper Error Handling)

- ✅ `src/app/api/applications/route.ts`
- ✅ `src/app/api/jobs/[jobId]/route.ts`
- ✅ `src/app/api/applications/[id]/route.ts`
- ✅ `src/app/api/jobs/route.ts`
- ✅ `src/app/api/user/stats/route.ts`
- ✅ `src/app/api/debug/redis/route.ts`

## Usage Examples

### Using Safe Wrappers in New Code

```typescript
import { safeRedisGet, safeRedisSet, isRedisHealthy } from '@/lib/redis';

// Check health before critical operations
const healthy = await isRedisHealthy();
if (!healthy) {
    console.warn('Redis unavailable, using fallback');
}

// Safe get - returns null on error
const cachedData = await safeRedisGet<UserData>('user:123');
if (cachedData) {
    return cachedData;
}

// Safe set - returns boolean
const cached = await safeRedisSet('user:123', userData, 300);
if (!cached) {
    console.warn('Failed to cache user data');
}
```

### Direct Redis Usage (with error handling)

```typescript
if (redis) {
    try {
        await redis.someOperation();
    } catch (error) {
        console.error('Redis operation failed:', error);
        // Application continues
    }
}
```

## Monitoring and Debugging

### Error Logging

All Redis errors are logged with descriptive messages:

```
Redis GET error: [error details]
Redis SET error: [error details]
Cache read error: [error details]
Redis operations error in message creation: [error details]
```

### Health Check Endpoint

Use the existing debug endpoint to check Redis health:

```bash
curl http://localhost:3000/api/debug/redis
```

Response includes:
- Configuration status
- Connection status
- Test operation results

### Recommended Monitoring

1. **Log Aggregation**: Monitor for "Redis.*error" patterns
2. **Health Checks**: Periodically call `isRedisHealthy()`
3. **Metrics**: Track cache hit/miss rates
4. **Alerts**: Alert on sustained Redis failures

## Benefits

1. **Reliability**: Application continues working during Redis outages
2. **Consistency**: All Redis operations follow the same error handling pattern
3. **Maintainability**: Wrapper functions centralize error handling logic
4. **Debugging**: Clear error messages aid in troubleshooting
5. **Monitoring**: Health check function enables proactive monitoring

## Testing

### Manual Testing

```bash
# Test with Redis configured
npm run dev

# Test with Redis unavailable (unset env vars)
unset REDIS_URL
unset KV_REST_API_URL
unset KV_REST_API_TOKEN
npm run dev
```

Application should work in both scenarios, with appropriate logging.

### Automated Testing

See `/tmp/test-redis-wrappers.ts` for a test script demonstrating all wrapper functions.

## Migration Guide

### For Existing Code

If you have existing Redis operations without error handling:

**Before:**
```typescript
const cached = await redis.get<string>(key);
```

**After (Option 1 - Use wrapper):**
```typescript
const cached = await safeRedisGet<string>(key);
```

**After (Option 2 - Add try-catch):**
```typescript
if (redis) {
    try {
        const cached = await redis.get<string>(key);
        // ... use cached
    } catch (error) {
        console.error('Cache read error:', error);
        // ... fallback
    }
}
```

### For New Code

Always use wrapper functions for Redis operations to maintain consistency.

## Future Improvements

Potential enhancements to consider:

1. **Circuit Breaker**: Temporarily disable Redis after multiple failures
2. **Retry Logic**: Automatic retry with exponential backoff
3. **Metrics Collection**: Track Redis operation success rates
4. **Connection Pooling**: Optimize Redis connection management
5. **Fallback Cache**: In-memory cache when Redis is unavailable

## Related Documentation

- [Upstash Redis Documentation](https://upstash.com/docs/redis/overall/getstarted)
- [Next.js Caching Strategies](https://nextjs.org/docs/app/building-your-application/caching)
- Project README: `README.md`
- Testing Guide: `TESTING_GUIDE.md`

## Questions or Issues?

If you encounter issues with Redis error handling:

1. Check logs for specific error messages
2. Verify Redis configuration in environment variables
3. Test with the health check endpoint
4. Review this documentation for proper usage patterns
