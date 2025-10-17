# Google Places API & Clerk Deprecation Fixes

## Summary

Fixed two deprecation issues that were causing console errors after migrating to the new Google Places API and updating Clerk.

## Issues Fixed

### 1. ❌ Google Places API `types` Property Error

**Error:**
```
Uncaught Error: This property is not available in this version of the API.
set types @ places.js:1093
```

**Root Cause:**
The `types` attribute is not supported on the new `gmp-place-autocomplete` web component in the Google Maps Places API v3.

**Fix:**
- Removed the `types` attribute from the `gmp-place-autocomplete` element in `src/components/ui/location-input.tsx`
- The component now returns all place types by default, which is appropriate for our UK-focused location search
- Updated TypeScript declaration to remove the deprecated `types` property

**Files Changed:**
- `src/components/ui/location-input.tsx`

### 2. ❌ Clerk Redirect URL Deprecation Warning

**Error:**
```
Clerk: The prop "afterSignInUrl" is deprecated and should be replaced with the new "fallbackRedirectUrl" or "forceRedirectUrl" props instead.
```

**Root Cause:**
Clerk has deprecated the `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` environment variables in favor of the new naming convention.

**Fix:**
Updated environment variable names in `.env.example`:
- ❌ `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` → ✅ `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`
- ❌ `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` → ✅ `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL`

**Files Changed:**
- `.env.example`

## Action Required

If you have a `.env.local` file, update it with the new environment variable names:

```bash
# Old (deprecated)
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# New (recommended)
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/onboarding
```

## Testing

✅ TypeScript type checking passes: `pnpm type-check`
✅ ESLint passes: `pnpm lint`

## Documentation Links

- [Clerk Custom Redirects Guide](https://clerk.com/docs/guides/custom-redirects#redirect-url-props)
- [Google Maps Places API - Place Autocomplete Element](https://developers.google.com/maps/documentation/javascript/place-autocomplete)

## Notes

- The Google Places autocomplete still works correctly for UK addresses with `component-restrictions: { country: "gb" }`
- The removal of `types` attribute does not affect functionality as the component returns appropriate results based on the UK restriction
- Clerk redirect behavior remains unchanged; only the configuration property names have been updated
