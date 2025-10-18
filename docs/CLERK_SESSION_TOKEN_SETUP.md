# Clerk Session Token Setup (REQUIRED)

## Problem
The middleware cannot read `publicMetadata` from session tokens because the Clerk Dashboard hasn't been configured to include it in the JWT.

## Solution

### Step 1: Configure Session Token in Clerk Dashboard

1. Go to your Clerk Dashboard: https://dashboard.clerk.com
2. Select your application
3. Navigate to **Sessions** in the left sidebar
4. Scroll down to **Customize session token**
5. In the **Claims editor**, add the following JSON:

```json
{
  "publicMetadata": "{{user.public_metadata}}"
}
```

6. Click **Save**

### Step 2: Verify Configuration

After saving, new session tokens will include the `publicMetadata` claim. You can verify this by:

1. Sign out of your application
2. Sign back in (to get a fresh token)
3. Check the middleware debug logs - you should see `hasPublicMetadata: true`

### Why This Is Required

By default, Clerk's session tokens **do not** include `publicMetadata`. You must explicitly configure the session token to include it.

Without this configuration:
- `sessionClaims?.publicMetadata` will be `undefined`
- Middleware cannot check onboarding status
- Users get stuck in infinite redirect loops

### TypeScript Support

The `types/globals.d.ts` file adds TypeScript support for the custom claim:

```typescript
interface CustomJwtSessionClaims {
  publicMetadata: {
    onboardingComplete?: boolean
    role?: string
  }
}
```

This gives you autocomplete and type safety when accessing `sessionClaims.publicMetadata`.

## Testing

After configuration, test with a fresh session:

```typescript
// In middleware or server component
const { sessionClaims } = await auth()
console.log(sessionClaims?.publicMetadata)
// Should output: { onboardingComplete: true, role: 'CUSTOMER' }
```

## References
- [Clerk Session Token Customization](https://clerk.com/docs/guides/sessions/session-tokens)
- [Custom Onboarding Flow Guide](https://clerk.com/docs/guides/development/add-onboarding-flow)
