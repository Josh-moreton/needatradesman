# Middleware Authentication Flow

## Overview
The middleware (`src/middleware.ts`) handles authentication and onboarding redirects for the application. It has been simplified to prevent redirect loops and improve maintainability.

## Flow Diagram

```
Request
  |
  v
Is Public Route? (/sign-in, /sign-up, /, /api/webhooks)
  |
  ├─ YES → Allow request
  |
  └─ NO
      |
      v
  Is user authenticated?
      |
      ├─ NO → Clerk redirects to /sign-in
      |
      └─ YES
          |
          v
      Is API route? (/api/*)
          |
          ├─ YES → Allow request
          |
          └─ NO
              |
              v
          Is onboarding complete?
              |
              ├─ NO → Is onboarding route?
              |        ├─ YES → Allow request
              |        └─ NO → Redirect to /onboarding
              |
              └─ YES → Is onboarding route?
                       ├─ YES → Redirect to /dashboard
                       └─ NO → Allow request
```

## Route Categories

### Public Routes (No Authentication Required)
- `/` - Landing page
- `/sign-in(.*)` - Sign in pages
- `/sign-up(.*)` - Sign up pages  
- `/api/webhooks(.*)` - Webhook endpoints (for Clerk, Stripe, etc.)

### Protected Routes (Authentication Required)
All other routes require authentication. Clerk automatically redirects unauthenticated users to `/sign-in`.

### Onboarding Routes
- `/onboarding(.*)` - Onboarding flow pages

### API Routes
- `/api/*` - All API routes (except webhooks) require authentication but skip onboarding check

## Edge Cases Handled

### 1. First-Time User Signup
**Flow:**
1. User signs up at `/sign-up`
2. Clerk webhook creates user in database with `onboardingComplete: false`
3. User redirected to any protected route
4. Middleware checks `sessionClaims.publicMetadata.onboardingComplete`
5. Not complete → Redirect to `/onboarding`
6. User completes onboarding, metadata updated
7. User can now access protected routes

### 2. Incomplete Onboarding
**Flow:**
1. User attempts to access protected route (e.g., `/dashboard`)
2. Middleware checks `onboardingComplete` in session claims
3. Not complete → Redirect to `/onboarding`
4. User cannot access any protected route until onboarding is complete

### 3. Completed Onboarding
**Flow:**
1. User has `onboardingComplete: true` in session claims
2. User can access all protected routes
3. If user tries to access `/onboarding`, redirect to `/dashboard`

### 4. Session Expiry
**Flow:**
1. User's session expires
2. Middleware finds no `userId`
3. Clerk automatically redirects to `/sign-in`
4. After re-authentication, session claims are restored
5. User continues to appropriate route based on onboarding status

### 5. API Route Access
**Flow:**
1. All API routes require authentication
2. API routes skip onboarding check (handled by API logic)
3. Webhooks are public (no authentication required)

### 6. Direct Onboarding Access (Already Complete)
**Flow:**
1. User with complete onboarding tries to access `/onboarding`
2. Middleware detects `onboardingComplete: true`
3. Redirect to `/dashboard`

## What Was Removed

### Removed from Production Code
1. **Bypass Parameter** (`hasBypassParam`) - Debug feature that could bypass auth
2. **Debug Routes** (`/debug-onboarding`) - Debug page removed entirely
3. **Fallback User Fetch** - Expensive Clerk API call removed
4. **Redundant Route Matchers** - Simplified to two matchers
5. **Excessive Logging** - All console.log statements removed
6. **Try-Catch Wrapper** - Simplified error handling
7. **Debug Mode Option** - Removed from middleware config

### Why These Were Removed
- **Security:** Bypass parameters and debug routes are security risks
- **Performance:** Fallback API calls were expensive and unnecessary
- **Maintainability:** Simpler code is easier to understand and maintain
- **Reliability:** Fewer code paths = fewer potential redirect loops

## Session Claims Source of Truth

The middleware relies **exclusively** on `sessionClaims.publicMetadata.onboardingComplete` to determine onboarding status.

### Why Session Claims Only?
1. **Performance:** No extra API calls to Clerk
2. **Consistency:** Single source of truth
3. **Reliability:** Session claims are always available after authentication
4. **Simplicity:** One code path to maintain

### How Session Claims Stay Updated
1. When onboarding is completed, the onboarding page updates Clerk metadata
2. Clerk automatically updates session claims on next request
3. Middleware reads the updated session claims

## Configuration

### Matcher Patterns
The middleware runs on all routes except:
- Next.js internals (`_next`)
- Static files (`.html`, `.css`, `.js`, images, fonts, etc.)

### Included Routes
- All application pages
- All API routes (including webhooks)
- TRPC routes (if used)

## Testing Checklist

### Manual Testing
- [ ] Sign up new user → Should redirect to `/onboarding`
- [ ] Complete onboarding → Should redirect to role-based dashboard
- [ ] Access protected route before onboarding → Should redirect to `/onboarding`
- [ ] Access `/onboarding` after completion → Should redirect to `/dashboard`
- [ ] Sign out and sign in → Should maintain onboarding status
- [ ] Access API routes → Should require auth but skip onboarding check
- [ ] Access webhook routes → Should work without authentication

### Edge Cases
- [ ] Session expiry → Should redirect to `/sign-in`
- [ ] Direct navigation to `/onboarding` when complete → Should redirect to `/dashboard`
- [ ] Rapid navigation between routes → Should not cause redirect loops
- [ ] API calls from authenticated pages → Should work correctly

## Troubleshooting

### User stuck in redirect loop
**Likely cause:** Session claims not updated after onboarding completion
**Solution:** Check that onboarding completion updates Clerk metadata correctly

### User can't access protected routes
**Likely cause:** `onboardingComplete` not set in Clerk metadata
**Solution:** Verify metadata update in onboarding flow

### API routes not working
**Likely cause:** Missing authentication token in request
**Solution:** Ensure API calls include Clerk authentication

### Webhooks failing
**Likely cause:** Webhooks not in public routes matcher
**Solution:** Verify `/api/webhooks(.*)` is in public routes (already included)

## Code Metrics

- **Lines of Code:** 62 (was 153)
- **Complexity:** Low (single responsibility per function)
- **API Calls:** 0 (was 1 fallback call)
- **Console Logs:** 0 (was 10+)
- **Route Matchers:** 2 (was 3)
