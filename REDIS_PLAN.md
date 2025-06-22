# 🗂️ Redis Integration Plan for needatradesman.co.uk

## 1. Job Feed Caching

- [ ] In `src/app/api/jobs/route.ts` (GET):
  - Before querying the DB, check Redis for a cached result using a key based on filters (e.g., `jobs:feed:<category>:<location>:<page>`).
  - If found, return cached jobs.
  - If not found, query DB, cache the result in Redis (with TTL, e.g., 60s), then return.
- [ ] On job create/update/delete (in relevant API routes):
  - Invalidate relevant job feed cache keys in Redis.

## 2. Rate Limiting

- [ ] In `src/app/api/jobs/route.ts` (POST):
  - Import and use `jobPostingRateLimit` to check if the user can post a job.
  - If over limit, return 429 error.
- [ ] In `src/app/api/applications/route.ts` (POST):
  - Import and use `applicationRateLimit` to check if the user can respond to jobs.
  - If over limit, return 429 error.

## 3. Live Chat (Future)

- [ ] Use Redis pub/sub for real-time chat between users.
- [ ] Integrate with `/messages/[chatId]` page and message API.

## 4. Notification System (Future)

- [ ] Use Redis pub/sub or lists for in-app/email notification queues.
- [ ] Trigger notifications on new responses, job status changes, etc.

## 5. Session/State Caching (Optional)

- [ ] Use Redis for ephemeral state (e.g., onboarding progress, temp tokens) as needed.

---

## Example: Job Feed Caching (Pseudo-code)

```ts
// In GET /api/jobs
const cacheKey = `jobs:feed:${category}:${location}:${page}`;
const cached = await redis.get(cacheKey);
if (cached) return NextResponse.json(JSON.parse(cached));

// ...fetch from DB...
await redis.set(cacheKey, JSON.stringify(jobs), { ex: 60 });
