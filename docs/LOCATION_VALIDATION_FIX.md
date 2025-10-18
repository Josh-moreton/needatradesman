# Location Validation Fix

## Problem
Users were getting "Location is required" errors when posting jobs, even after selecting a location from the Google Places autocomplete dropdown.

## Root Cause
The validation logic was checking for **text presence** in the input field rather than validating that a **valid place was actually selected** from Google Places. With the Google Places Autocomplete (New) API, the only proof of a valid selection is the **Place ID** captured from the `gmp-placeselect` event.

### The Issue
- Text in the input field ≠ Valid place selection
- Users could type arbitrary text without selecting from the dropdown
- The form was validating `displayText.length > 0` instead of checking for a Place ID

## Solution
Changed validation to check for the presence of a **Place ID**, which is the canonical proof that a user selected a valid place from Google Places.

### Key Changes

#### 1. Updated LocationData Schema (`src/lib/schemas.ts`)
```typescript
export const locationDataSchema = z.object({
    id: z.string().min(1, 'Please select a location from the dropdown'), // Place ID is now required
    displayText: z.string(),
    formattedAddress: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    city: z.string().optional(),
    postcode: z.string().optional(),
});
```

#### 2. Updated Job Creation Validation (`src/lib/schemas.ts`)
```typescript
.superRefine((data, ctx) => {
    // Validate on Place ID presence - the only proof of a valid selection
    const hasValidLocation = !!data.locationData?.id
    
    if (!hasValidLocation) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Please select a location from the dropdown',
            path: ['locationData'],
        })
    }
})
```

#### 3. Enhanced LocationInput Component (`src/components/ui/location-input.tsx`)
- Added `id` field to `LocationData` interface
- Fetch `id` field in `fetchFields()` call
- Extract Place ID from both:
  - `place.id` for Places autocomplete selections
  - `result.place_id` for geocoded locations (current location button)
- Added `input` event listener to clear selection if user types after selecting (typed text alone is meaningless)

#### 4. Updated Database Schema (`prisma/schema.prisma`)
```prisma
model Job {
  // ...
  placeId String? // Google Places ID for validation and future verification
  // ...
}
```

#### 5. Updated API Route (`src/app/api/jobs/route.ts`)
```typescript
const job = await prisma.job.create({
    data: {
        // ...
        placeId: locationData?.id, // Store Place ID
        // ...
    },
});
```

## Benefits

1. **Accurate Validation**: Only accepts valid Google Places selections
2. **Better UX**: Clear error message tells users to "select from the dropdown"
3. **Server-side Verification Ready**: With the stored Place ID, we can verify selections server-side via [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details)
4. **Prevents Invalid Data**: Users can't submit arbitrary text as a location
5. **Future-proof**: Aligns with Google's recommended pattern for Places API (New)

## Testing
1. Navigate to job posting form
2. Start typing a location
3. **Don't** select from dropdown → Should show validation error
4. Select a location from dropdown → Error clears and form submits successfully
5. Test with "Use current location" button → Should work (geocoder provides Place ID)

## Related Documentation
- [Google Places Autocomplete Widget](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new)
- [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id)
- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details)

## Migration
Run: `pnpm prisma migrate dev` (already applied: `20251018132602_add_place_id_to_job`)
