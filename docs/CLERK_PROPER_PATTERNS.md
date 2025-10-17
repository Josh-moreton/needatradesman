# The Proper Clerk Way: Lessons in Following Official Patterns

## The Journey
We started with broken onboarding after middleware simplification. Our first fix was to add delays, dual reloads (`session` + `user`), and hard redirects with `window.location.href`. While this "worked," it was a bodge.

When questioned if this was the CORRECT pattern, we consulted Clerk's official documentation and discovered **we were massively overcomplicating it**.

## What Clerk's Official Docs Say

From: https://clerk.com/docs/guides/development/add-onboarding-flow

### The Pattern (Client-Side)
```typescript
const { user } = useUser()
const router = useRouter()

const handleSubmit = async (formData: FormData) => {
  const res = await completeOnboarding(formData)
  if (res?.message) {
    // Reloads the user's data from the Clerk API
    await user?.reload()
    router.push('/')
  }
}
```

### The Pattern (Server-Side)
```typescript
'use server'

import { auth, clerkClient } from '@clerk/nextjs/server'

export const completeOnboarding = async (formData: FormData) => {
  const { userId } = await auth()
  const client = await clerkClient()
  
  const res = await client.users.updateUser(userId, {
    publicMetadata: {
      onboardingComplete: true,
      // ... other metadata
    },
  })
  
  return { message: res.publicMetadata }
}
```

### The Middleware Pattern
```typescript
export default clerkMiddleware(async (auth, req: NextRequest) => {
  const { sessionClaims } = await auth()
  
  // Catch users who do not have onboardingComplete: true
  // Redirect them to the /onboarding route
  if (isAuthenticated && !sessionClaims?.metadata?.onboardingComplete) {
    const onboardingUrl = new URL('/onboarding', req.url)
    return NextResponse.redirect(onboardingUrl)
  }
})
```

## What We Were Doing Wrong

### ❌ Our Bodged Approach
```typescript
// Reload both session and user
await Promise.all([
  session?.reload(),
  user?.reload()
]);

// Add artificial delay
await new Promise(resolve => setTimeout(resolve, 300));

// Force hard refresh
window.location.href = "/dashboard";
```

**Problems:**
1. Using `session?.reload()` (unnecessary)
2. Adding artificial delays (brittle)
3. Using `window.location.href` instead of Next.js router
4. Overthinking the JWT refresh problem
5. Not trusting Clerk's architecture

### ✅ The Proper Way
```typescript
// Just reload the user data
await user?.reload()

// Use Next.js router
router.push('/dashboard')
```

**Why It Works:**
1. `user?.reload()` fetches fresh data including publicMetadata
2. Clerk automatically updates the session token on the next request
3. `router.push()` triggers Next.js client-side navigation
4. Middleware sees the updated session claims
5. No delays, no hard redirects, no `session?.reload()`

## Key Architectural Insights

### How Clerk's Session Token Works
1. Backend updates `publicMetadata` via Clerk API
2. Client calls `user?.reload()` to fetch updated user object
3. Clerk's SDK automatically refreshes the JWT cookie
4. Next request to server includes the refreshed JWT
5. Middleware reads the updated `sessionClaims`

### Why Hard Redirects Are Wrong
- `window.location.href` forces full page reload
- Breaks Next.js client-side navigation
- Loses optimistic updates
- Not necessary when Clerk handles JWT refresh automatically

### Why Delays Are Wrong
- Artificial delays are brittle (race conditions)
- Clerk's `user?.reload()` is a promise that waits for completion
- If reload completes, data is fresh - no need to wait more
- Adding delays suggests we don't trust the async operation

## The Middleware API Route Issue

We also fixed this correctly:

```typescript
// Skip onboarding checks for API routes
if (pathname.startsWith('/api/')) {
    return NextResponse.next()
}
```

This is standard practice:
- Middleware protects **page routes**
- API routes protect **themselves** with `auth()` checks
- Trying to protect API routes in middleware creates chicken-and-egg problems

## Lessons for This Project

### Always Check Official Docs First
Before implementing custom solutions, search for:
- Official guides (Clerk has an entire onboarding guide!)
- Sample repositories (they have a working example!)
- Common patterns in the community

### Trust the Framework's Architecture
- Clerk designed `user?.reload()` to solve this exact problem
- Next.js router is designed for client-side navigation
- Don't fight the framework with workarounds

### Simpler Is Better
Our "fix" went from:
- **Before:** 100+ lines of retry logic, delays, fallbacks
- **After:** 3 lines following Clerk's docs

### When Something Feels Like a Bodge, It Probably Is
The question "is this the CORRECT pattern?" was the right instinct.
- Delays feel wrong because they are
- Hard redirects feel wrong because they are
- Complex retry logic feels wrong because it is

## Apply This Thinking Everywhere

This same lesson applies to:
- Redis usage (is our wrapper necessary or is ioredis + Next.js cache enough?)
- Logging (do we need Pino or is Vercel's logging enough?)
- Error handling (are we overcomplicating it?)

**Before adding complexity, ask:**
1. Does the official documentation show a simpler way?
2. Is there a sample app demonstrating the pattern?
3. Are we fighting the framework or working with it?
4. Would a beginner understand this code?

## References
- [Clerk Onboarding Guide](https://clerk.com/docs/guides/development/add-onboarding-flow)
- [Clerk Middleware Reference](https://clerk.com/docs/references/nextjs/clerk-middleware)
- [Clerk Sample App](https://github.com/clerk/clerk-nextjs-onboarding-sample-app)
- [Next.js useRouter Hook](https://nextjs.org/docs/app/api-reference/functions/use-router)

## The Bottom Line

**Old philosophy:** "Clerk is complex, we need custom retry logic to handle JWT refresh"

**New philosophy:** "Clerk is well-designed, follow their patterns exactly"

This is a **marketplace app**, not a novel authentication system. We should be learning from and trusting the tools we chose, not reinventing them.
