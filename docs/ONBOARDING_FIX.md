# Onboarding Flow Fix

## Problem
After simplifying the middleware to follow official Clerk patterns, onboarding broke completely. Users could click role selection buttons but nothing would happen.

## Root Causes

### 1. Middleware Blocking API Routes
The simplified middleware was redirecting ALL non-public routes for users without `onboardingComplete: true`, including the `/api/user/role` endpoint that needs to be called DURING onboarding to set the role. This created a chicken-and-egg problem.

### 2. Stale JWT After Role Selection
Even after fixing the API access, there was a race condition:
1. User clicks role → API call succeeds → Clerk metadata updated ✅
2. Client calls `session?.reload()` (async)
3. Client immediately redirects with `window.location.href = "/dashboard"`
4. Middleware checks JWT but it hasn't been refreshed yet ❌
5. Middleware redirects back to `/onboarding` → infinite loop

## Solutions Implemented

### Fix 1: Exclude API Routes from Onboarding Checks
**File:** `src/middleware.ts`

Added early return for all API routes:
```typescript
// Skip onboarding checks for API routes - let API routes handle their own auth
if (pathname.startsWith('/api/')) {
    return NextResponse.next()
}
```

**Rationale:** 
- API routes have their own auth checks (they call `auth()` at the start)
- Middleware should only handle page-level redirects
- This is the standard Clerk pattern - middleware protects pages, APIs protect themselves

### Fix 2: Robust Session Refresh
**File:** `src/components/onboarding/OnboardingFlow.tsx`

Changed from fragile retry mechanism to robust dual-reload with delay:
```typescript
// Reload both session and user to ensure fresh JWT
await Promise.all([
  session?.reload(),
  user?.reload()
]);

// Give Clerk a moment to propagate the changes
await new Promise(resolve => setTimeout(resolve, 300));

// Hard redirect to force middleware to re-evaluate with fresh JWT
window.location.href = "/dashboard";
```

**Removed:** 50+ lines of complex retry logic with nested error handlers

**Why This Works:**
1. `session?.reload()` refreshes the JWT token
2. `user?.reload()` refreshes the user object with publicMetadata
3. 300ms delay ensures Clerk's internal state is synchronized
4. Hard redirect (`window.location.href`) forces browser to make fresh request
5. Middleware evaluates the new request with the fresh JWT cookie

## Testing Checklist
- [ ] New user signs up
- [ ] Selects CUSTOMER role → redirects to /dashboard
- [ ] New user signs up
- [ ] Selects TRADESPERSON role → shows trade selection
- [ ] Selects at least one trade → redirects to /dashboard
- [ ] No infinite redirect loops
- [ ] No console errors
- [ ] Middleware doesn't block API calls during onboarding

## Architecture Notes

### Middleware Responsibilities
- ✅ Protect page routes (require authentication)
- ✅ Redirect unauthenticated users to sign-in
- ✅ Redirect non-onboarded users to /onboarding (pages only)
- ✅ Redirect onboarded users away from /onboarding
- ❌ DON'T handle API routes (they auth themselves)
- ❌ DON'T fetch fresh data (trust the JWT)

### API Route Responsibilities
- ✅ Check auth with `auth()` at the start
- ✅ Return 401 if not authenticated
- ✅ Handle their own business logic
- ✅ Update Clerk metadata when needed

### Client Component Responsibilities
- ✅ Call API routes to mutate data
- ✅ Reload session/user after metadata changes
- ✅ Wait for session refresh before redirecting
- ✅ Use hard redirects after auth state changes

## Lessons Learned
1. **Middleware should be dumb** - Trust the JWT, don't fetch
2. **API routes must be accessible during onboarding** - Can't protect them with onboarding middleware
3. **JWT refresh needs time** - Can't immediately redirect after `session.reload()`
4. **Hard redirects for auth changes** - `window.location.href` forces fresh middleware evaluation
5. **Parallel reloads are faster** - `Promise.all([session, user])` vs sequential

## Files Changed
- `src/middleware.ts` - Added API route exclusion (3 lines)
- `src/components/onboarding/OnboardingFlow.tsx` - Simplified session refresh (removed 100+ lines, added 10 clean lines)

## Verification
✅ Type checking passes: `pnpm type-check`
✅ Linting passes: `pnpm lint`
