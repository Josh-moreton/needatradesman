# 🗂️ Redis Integration Plan for needatradesman.co.uk

## 1. Job Feed Caching ✅ COMPLETED

- [x] In `src/app/api/jobs/route.ts` (GET):
  - Before querying the DB, check Redis for a cached result using a key based on filters (e.g., `jobs:feed:<category>:<location>:<page>`).
  - If found, return cached jobs.
  - If not found, query DB, cache the result in Redis (with TTL, e.g., 60s), then return.
- [x] On job create/update/delete (in relevant API routes):
  - Invalidate relevant job feed cache keys in Redis.
- [x] Enhanced with pagination, search, and comprehensive filter caching
- [x] Improved cache key strategy with category-based invalidation

## 2. Rate Limiting ✅ COMPLETED

- [x] In `src/app/api/jobs/route.ts` (POST):
  - Import and use `jobPostingRateLimit` (rate-limiter-flexible) to check if the user can post a job.
  - If over limit, return 429 error.
- [x] In `src/app/api/applications/route.ts` (POST):
  - Import and use `applicationRateLimit` (rate-limiter-flexible) to check if the user can respond to jobs.
  - If over limit, return 429 error.
- [x] Message rate limiting also implemented (50 messages per hour)

## 3. Live Chat ✅ PARTIALLY COMPLETED

- [x] Use Redis pub/sub for real-time chat between users.
- [x] Integrate with `/messages/[chatId]` page and message API.
- [x] Redis caching for conversations and messages
- [ ] WebSocket implementation for real-time updates (future enhancement)

## 4. Application Caching ✅ COMPLETED

- [x] Cache user applications by role (customer/tradesperson)
- [x] Invalidate application caches when new applications are created
- [x] Invalidate caches when application status changes (accept/reject)
- [x] Cache job detail pages with application data

## 5. Comprehensive Cache Invalidation ✅ COMPLETED

- [x] Job feed cache invalidation on job creation
- [x] Application cache invalidation on application changes
- [x] Job detail cache invalidation on updates
- [x] Category-based cache clearing for better performance
- [x] User stats caching for dashboard performance

## 6. Session/State Caching ✅ AVAILABLE

- [x] Redis infrastructure ready for ephemeral state caching
- [x] Helper functions available for user stats and session data
- [ ] Implement onboarding progress caching (optional future enhancement)

---

## Example: Job Feed Caching (Pseudo-code)

```ts
// In GET /api/jobs
const cacheKey = `jobs:feed:${category}:${location}:${page}`;
const cached = await redis.get(cacheKey);
if (cached) return NextResponse.json(JSON.parse(cached));

// ...fetch from DB...
await redis.set(cacheKey, JSON.stringify(jobs), 'EX', 60);
```
