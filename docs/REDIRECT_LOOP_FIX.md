# Infinite Redirect Loop Fix

## Issue

An infinite redirect loop was occurring between `/onboarding` → `/dashboard` → `/onboarding` → ... repeating forever.

## Root Cause

The Clerk session JWT was **stale/missing** the `publicMetadata` field:

```json
{
  "hasPublicMetadataField": false,
  "onboarded": undefined
}
```

This caused the middleware to:
1. Fetch fresh user data from Clerk API on EVERY request (~170ms per request)
2. Discover user WAS onboarded
3. Redirect from `/onboarding` → `/dashboard`
4. Next request would have the same stale JWT
5. Repeat forever

## Why Session Claims Were Stale

Clerk JWTs have a TTL and don't immediately reflect `publicMetadata` changes. This can happen when:
- User just completed onboarding
- Metadata update hasn't propagated to the JWT yet
- Browser/server caching issues
- Multiple rapid requests before JWT refresh

## Solution

**Modified `src/middleware.ts`:**

Changed from fetching fresh data on every request to **skipping middleware checks** when session is stale:

```typescript
// Old (caused loops):
if (!('publicMetadata' in sessionClaims)) {
    // Fetch fresh data, redirect based on that
    const freshUser = await clerkClient.users.getUser(userId)
    onboarded = freshUser.publicMetadata?.onboardingComplete
}

// New (prevents loops):
if (!('publicMetadata' in sessionClaims)) {
    logger.warn('Session stale, allowing through to avoid loops')
    return // Let page handle auth, don't redirect
}
```

## Why This Works

1. **Middleware doesn't fight with pages**: When JWT is stale, middleware steps aside
2. **Pages handle their own auth**: Each page validates and redirects appropriately
3. **Natural JWT refresh**: Next request will likely have refreshed JWT
4. **No API spam**: We don't fetch from Clerk API on every middleware run

## Testing

After the fix:
```bash
pnpm dev
# Navigate to site while logged in
# Should NOT see repeated redirects in terminal
```

## Prevention

To minimize stale JWT issues:

### Option 1: Force JWT Refresh After Onboarding (Recommended)
```typescript
// In onboarding completion API
import { clerkClient } from '@clerk/nextjs/server'

// After saving to database
await clerkClient.users.updateUserMetadata(userId, {
  publicMetadata: { onboardingComplete: true, role }
})

// Force client to refresh session
return NextResponse.json({ 
  success: true,
  refreshSession: true // Signal client to refresh
})
```

### Option 2: Client-Side Session Refresh
```typescript
// After onboarding API call
const { session } = useSession()
await session?.reload() // Force JWT refresh
```

### Option 3: Increase JWT TTL (Not Recommended)
In Clerk Dashboard → Sessions → JWT Template → Increase token lifetime
- ⚠️ Security tradeoff
- ✅ Reduces stale JWT issues

## Related Files

- `src/middleware.ts` - Fixed redirect logic
- `src/app/page.tsx` - Home page with conditional redirects  
- `src/app/dashboard/page.tsx` - Dashboard with role checks
- `src/app/onboarding/page.tsx` - Onboarding flow

## Monitoring

Watch for these log patterns indicating the issue:
```
Session claims missing publicMetadata field - session may be stale
```

If you see this frequently, consider implementing forced session refresh after onboarding completion.
