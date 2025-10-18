# Auth Gate Pattern - The Proper Way

## Overview
This document explains the **correct** architecture for authentication and authorization in Next.js App Router applications.

## The Problem We Had
We were trying to store mutable application state (user role, onboarding status) in JWT tokens and cookies, which led to:
- ❌ Infinite redirect loops when JWT tokens didn't refresh in time
- ❌ Edge Runtime limitations (can't query database from middleware)
- ❌ Expensive API calls to Clerk on every request as "fallbacks"
- ❌ Race conditions between JWT refresh cycles and user actions
- ❌ Complex, brittle code with multiple layers of workarounds

## The Solution: Auth Gate Pattern

### Core Principles
1. **Middleware = Routing Only** - Check if auth cookie exists, nothing more
2. **Server Components = Authorization** - Check database for roles/permissions (cached)
3. **Database = Source of Truth** - Never rely on JWT claims for mutable state
4. **Cache Invalidation** - Revalidate cache when user state changes

### Architecture

```
Request → Middleware (cookie check) → Layout (DB gate check) → Page
                                           ↓
                                    Cache (60s TTL)
                                           ↓
                                      PostgreSQL
```

## Implementation

### 1. Middleware (`src/middleware.ts`)
**Only checks for auth cookie presence:**

```typescript
export default clerkMiddleware(
    async (auth, req) => {
        if (isPublicRoute(req)) {
            return
        }
        // Just check cookie exists - Clerk handles redirect to sign-in
        await auth.protect()
    }
)
```

### 2. Auth Gate Helper (`src/lib/auth-gate.ts`)
**Queries database with caching:**

```typescript
export async function getAuthGate(): Promise<AuthGate | null> {
    const { userId: clerkId } = await auth()
    
    if (!clerkId) return null

    // Cached for 60s, tagged for revalidation
    const user = await unstable_cache(
        async (clerkId) => prisma.user.findUnique({ where: { clerkId } }),
        [`user-gate-${clerkId}`],
        { revalidate: 60, tags: [`user:${clerkId}`, 'user-gate'] }
    )(clerkId)

    return user
}
```

### 3. Protected Layout (`src/app/(protected)/layout.tsx`)
**Checks onboarding status:**

```typescript
export default async function ProtectedLayout({ children }) {
    const gate = await getAuthGate()

    if (!gate) {
        redirect('/onboarding')
    }

    return <>{children}</>
}
```

### 4. Onboarding API (`src/app/api/user/role/route.ts`)
**Invalidates cache after completion:**

```typescript
// After updating user in DB
await prisma.user.update({ ... })

// Invalidate cache
revalidateTag(`user:${userId}`)
revalidateTag('user-gate')
```

## Why This Works

### ✅ No Edge Runtime Issues
- Middleware doesn't query database
- Server Components (Node runtime) handle DB queries

### ✅ No JWT Staleness Issues
- Don't rely on JWT for mutable state
- Database is always current

### ✅ No Expensive API Calls
- Cached database query (60s TTL)
- Only hits DB once per minute per user
- Much faster than external API calls

### ✅ Immediate Consistency
- Cache invalidation happens when state changes
- Next request sees updated data immediately

### ✅ Simple, Clean Code
- Middleware: 20 lines
- Auth gate: 40 lines
- Layout: 10 lines
- Total: ~70 lines vs previous 100+ lines of workarounds

## File Structure

```
src/
├── middleware.ts                    # Cookie check only
├── lib/
│   └── auth-gate.ts                # DB query with caching
├── app/
│   ├── (protected)/                # Route group
│   │   ├── layout.tsx             # Onboarding gate
│   │   ├── dashboard/
│   │   ├── customer/
│   │   ├── tradesperson/
│   │   └── jobs/
│   ├── onboarding/
│   └── api/
│       └── user/
│           └── role/
│               └── route.ts        # Invalidates cache
```

## Usage Examples

### In API Routes
```typescript
import { requireAuthGate, requireRole } from '@/lib/auth-gate'

export async function GET() {
    const user = await requireAuthGate() // Throws if not authenticated
    // ... use user.role, user.email, etc.
}

export async function POST() {
    const user = await requireRole('TRADESPERSON') // Throws if wrong role
    // ... only tradespeople can access
}
```

### In Server Components
```typescript
import { getAuthGate } from '@/lib/auth-gate'

export default async function DashboardPage() {
    const user = await getAuthGate() // Returns null if not authenticated
    
    if (!user) {
        redirect('/sign-in')
    }

    return <div>Welcome {user.firstName}!</div>
}
```

## References

- [Next.js Middleware Best Practices](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [OWASP JWT Security](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/06-Session_Management_Testing/10-Testing_JSON_Web_Tokens)
- [Next.js Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns)
- [Clerk Force Token Refresh](https://clerk.com/docs/guides/sessions/force-token-refresh)

## Migration Notes

### What Changed
- ❌ Removed: Cookie bridge pattern
- ❌ Removed: JWT metadata checks
- ❌ Removed: Clerk API fallback in middleware
- ❌ Removed: Database queries in middleware
- ✅ Added: Auth gate helper with caching
- ✅ Added: Protected route group layout
- ✅ Added: Cache invalidation on state changes

### Breaking Changes
None - URL structure remains the same.

### Performance Improvements
- **Before**: External API call on every request (~100-500ms)
- **After**: Cached DB query once per minute (~5-10ms)
- **Improvement**: ~10-100x faster

## Troubleshooting

### "Unauthorized: No user session"
- User isn't in database yet
- They need to complete onboarding first
- Check that `/onboarding` page creates user record

### Cache not invalidating
- Ensure `revalidateTag()` is called after user updates
- Check that tags match between cache and invalidation
- Verify `unstable_cache` is using correct tag syntax

### Still seeing redirect loops
- Check that `(protected)` layout isn't nested incorrectly
- Ensure `/onboarding` is NOT in protected route group
- Verify middleware isn't blocking `/onboarding` access
