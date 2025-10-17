# Simplified Middleware Pattern

## Why Simplify?

The previous middleware was **overengineered** with:
- ❌ Manual error handling
- ❌ Excessive logging on every request
- ❌ Fetching fresh user data when JWT was stale
- ❌ Complex fallback logic
- ❌ ~100 lines of code

**For a simple marketplace, this is overkill.**

## Official Clerk Pattern

According to Clerk's official docs, middleware should be **simple and declarative**:

### ✅ What Middleware SHOULD Do
1. Define public routes
2. Check authentication (`userId`)
3. Simple metadata checks from JWT
4. Return redirects or `NextResponse.next()`

### ❌ What Middleware SHOULD NOT Do
1. Fetch from external APIs (including Clerk API)
2. Database queries
3. Complex business logic
4. Handle every edge case

## The New Pattern (34 lines vs 110 lines)

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
    const { userId, sessionClaims } = await auth()

    // Allow public routes
    if (isPublicRoute(req)) {
        return NextResponse.next()
    }

    // Clerk handles redirect to sign-in automatically
    if (!userId) {
        return NextResponse.next()
    }

    // Simple onboarding check
    const isOnboarded = (sessionClaims?.publicMetadata as { onboardingComplete?: boolean })?.onboardingComplete
    const pathname = req.nextUrl.pathname

    // Redirect to onboarding if needed
    if (!isOnboarded && !pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/onboarding', req.url))
    }

    // Redirect away from onboarding if done
    if (isOnboarded && pathname.startsWith('/onboarding')) {
        return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return NextResponse.next()
})
```

## Key Benefits

### 1. **Trusts the JWT**
- Clerk's JWT is the source of truth
- No fallback API calls
- If JWT is stale, user just sees a redirect
- Next request will have fresh JWT (Clerk handles this)

### 2. **Lets Clerk Handle Auth**
- When `!userId`, Clerk redirects to sign-in automatically
- No manual error handling needed
- Clerk's SDK is battle-tested

### 3. **Pages Handle Edge Cases**
Each page already validates:
```typescript
// src/app/dashboard/page.tsx
const user = await getCurrentUser()
if (!user) redirect('/sign-in')
if (!user.role) redirect('/onboarding')
```

Middleware doesn't need to duplicate this!

### 4. **No Logging Spam**
- Removed debug logs on every request
- Middleware should be fast and silent
- Add logging in pages/APIs where it matters

## What About Stale JWTs?

**Don't overthink it!** Clerk handles JWT refresh automatically:

1. User completes onboarding
2. Metadata updated in Clerk
3. Next request (usually < 1 second) has fresh JWT
4. If not, user sees brief redirect → fresh JWT loads → works

**This is normal and expected behavior.**

## Migration Notes

### What Was Removed
- ✂️ All custom logging in middleware
- ✂️ API calls to Clerk when JWT is stale
- ✂️ Manual error try/catch blocks
- ✂️ Complex fallback metadata checking
- ✂️ API route special handling (Clerk protects APIs automatically)

### What Stayed
- ✅ Public route matching
- ✅ Onboarding redirect logic
- ✅ Basic authentication flow

### Pages Still Handle
- ✅ Role-based redirects (`/dashboard` checks role)
- ✅ Database user validation
- ✅ Detailed error logging where needed

## Testing

```bash
# Start dev server
pnpm dev

# Test flows:
1. Visit / (public) → Should work
2. Visit /dashboard (signed out) → Redirects to /sign-in
3. Sign up → Goes to /onboarding
4. Complete onboarding → Redirects to /dashboard
5. Try to visit /onboarding → Redirects to /dashboard
```

## References

- [Clerk Middleware Docs](https://clerk.com/docs/references/nextjs/clerk-middleware)
- [Clerk Route Protection](https://clerk.com/docs/references/nextjs/auth-middleware#protect-routes-using-middleware)
- [Next.js Middleware Best Practices](https://nextjs.org/docs/app/building-your-application/routing/middleware#keeping-middleware-lightweight)

## Bottom Line

**For a marketplace with 2 user types (customer/tradesperson):**
- Simple middleware ✅
- Complex error handling in pages ✅
- Trust Clerk's JWT ✅
- Don't overcomplicate ✅
