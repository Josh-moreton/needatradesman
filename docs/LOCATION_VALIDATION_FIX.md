# Location Validation Fix

## Problem
Users were getting "Location is required" errors when posting jobs, even after selecting a location from the Google Places autocomplete dropdown.

## Root Cause
The validation logic was checking for **text presence** in the input field rather than validating that a **valid place was actually selected** from Google Places. With the Google Places Autocomplete (New) API, the only proof of a valid selection is the **Place ID** captured from the `gmp-select` event.

### The Issue
- Text in the input field ≠ Valid place selection
- Users could type arbitrary text without selecting from the dropdown
- The form was validating `displayText.length > 0` instead of checking for a Place ID
- Wrong event name (`gmp-placeselect` instead of `gmp-select`)

## Solution
Changed validation to check for the presence of a **Place ID** (`place.id` in Places New), which is the canonical proof that a user selected a valid place from Google Places.

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

**Critical Fixes:**
- ✅ **Changed event from `gmp-placeselect` to `gmp-select`** (correct event for Places New)
- ✅ **Use `placePrediction.toPlace()` flow** as documented by Google
- ✅ **Extract `place.id`** (not legacy `place_id`) from Places API
- ✅ Added `input` event listener to clear selection if user types after selecting
- ✅ Changed `component-restrictions` to `included-region-codes` for Places (New)

```typescript
element.addEventListener("gmp-select", async (event: Event) => {
  const selectEvent = event as CustomEvent<{ placePrediction: google.maps.places.PlacePrediction }>;
  const placePrediction = selectEvent.detail?.placePrediction;
  
  const place = placePrediction.toPlace();
  await place.fetchFields({
    fields: ["id", "formattedAddress", "location", "addressComponents", "displayName"],
  });
  
  const locationData = {
    id: place.id, // Places (New) uses place.id
    // ... other fields
  };
  onChange(locationData);
});

// Clear selection if user types after selecting
element.addEventListener("input", () => {
  onChange(null);
});
```

#### 4. Updated Database Schema (`prisma/schema.prisma`)
```prisma
model Job {
  // ...
  placeId String? // Google Places ID for validation and future verification
  // ...
}
```

#### 5. Server-Side Verification (`src/app/api/jobs/route.ts`)
Added Place ID verification via Place Details (New) API:

```typescript
if (locationData?.id) {
    const verifyResponse = await fetch(
        `https://places.googleapis.com/v1/places/${locationData.id}?fields=id,formattedAddress,location&key=${apiKey}`,
        { headers: { 'X-Goog-Api-Key': apiKey } }
    );
    
    if (!verifyResponse.ok) {
        return new NextResponse("Invalid location: Place ID could not be verified", { status: 400 });
    }
    
    // Verify coordinates match (within tolerance)
    const placeDetails = await verifyResponse.json();
    // ... coordinate validation
}
```

## Benefits

1. **Accurate Validation**: Only accepts valid Google Places selections via `gmp-select` event
2. **Correct API Usage**: Uses Places (New) `place.id` instead of legacy `place_id`
3. **Server-Side Verification**: Verifies Place ID via Place Details (New) API with minimal field mask
4. **Clear Selection on Edit**: If user types after selecting, validation fails until new selection
5. **Better UX**: Clear error message tells users to "select from the dropdown"
6. **Prevents Invalid Data**: Users can't submit arbitrary text as a location
7. **Future-proof**: Aligns with Google's recommended pattern for Places API (New)
8. **UK-Focused**: Uses `included-region-codes: ["gb"]` for UK-centric suggestions

## Important Notes

### Place ID vs place_id
- **Places (New)**: Uses `place.id` (accessed via `placePrediction.toPlace()`)
- **Geocoder (Legacy)**: Still returns `place_id` field
- Both are valid Place IDs and work with Place Details API

### "Use Current Location" Button
- Geolocation API gives **coordinates only** (no Place ID)
- We use Geocoder to reverse-geocode coordinates → get Place ID
- Geocoder returns legacy `place_id` field, which we store as `id`

### Hidden Input Validation
- **Don't rely on HTML `required`** for hidden inputs
- HTML spec excludes hidden controls from constraint validation
- Use form schema (Zod/RHF) to enforce `location.id` presence

## Testing Checklist

- [ ] Typing text and submitting → **Fails** validation ("Please select a location from the dropdown")
- [ ] Selecting a dropdown item (click or keyboard) → **Passes**; `location.id` populated with Place ID
- [ ] Editing after selection → **Fails** validation until new selection made
- [ ] "Use current location" button → **Passes**; gets Place ID via Geocoder
- [ ] Server logs show Place ID verification success
- [ ] Invalid/tampered Place ID → Server rejects with 400 error
- [ ] Coordinate mismatch → Server rejects with 400 error

## Related Documentation
- [Place Autocomplete Widget (New)](https://developers.google.com/maps/documentation/javascript/place-autocomplete-new) - Uses `gmp-select` event
- [Place IDs](https://developers.google.com/maps/documentation/places/web-service/place-id)
- [Place Details (New)](https://developers.google.com/maps/documentation/places/web-service/place-details) - Server verification
- [HTML Constraint Validation](https://www.w3.org/TR/2014/CR-html5-20140429/forms.html) - Why hidden inputs aren't validated

## Migration
Run: `pnpm prisma migrate dev` (already applied: `20251018132602_add_place_id_to_job`)

## Future Enhancements
- [ ] Add session token to tie Autocomplete → Details for cleaner billing
- [ ] Consider caching verified Place IDs to reduce API calls
- [ ] Add monitoring/alerting for Place ID verification failures
