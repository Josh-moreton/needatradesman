# Location Services Setup

This project uses **Google Maps Places API** for smart location input with autocomplete and geolocation features.

## Features

- ✨ **Smart Autocomplete**: Real UK addresses with Google Places Autocomplete
- 📍 **Auto-detect Location**: One-click current location detection using browser geolocation
- 🎯 **Structured Data**: Stores coordinates, postcode, city for advanced filtering
- 🔍 **Better Search**: Search by postcode, city, or location text
- 🇬🇧 **UK-Focused**: Biased to UK addresses for better results

## Setup Instructions

### 1. Get a Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Places API** and **Maps JavaScript API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Places API" and enable it
   - Search for "Maps JavaScript API" and enable it
4. Go to "APIs & Services" → "Credentials"
5. Click "Create Credentials" → "API Key"
6. **Important**: Restrict your API key for security:
   - Click on the created key to edit it
   - Under "Application restrictions", select "HTTP referrers"
   - Add your domains:
     - `localhost:*` (for development)
     - `your-domain.com` (for production)
   - Under "API restrictions", select "Restrict key"
   - Choose: "Places API" and "Maps JavaScript API"
7. Copy your API key

### 2. Add Environment Variable

Create or update your `.env.local` file in the project root:

```bash
# Google Maps API Key for location services
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

⚠️ **Important**: The `NEXT_PUBLIC_` prefix exposes this to the browser. Make sure to:
- Use API key restrictions (see step 1.6 above)
- Never commit `.env.local` to git (already in .gitignore)
- Use different keys for development and production

### 3. Restart Development Server

After adding the environment variable:

```bash
pnpm dev
```

## Usage

The location input is automatically used in:

- **Job Creation**: When posting a new job (`/customer/jobs/new`)
- **Job Search**: When filtering jobs (`/tradesperson/jobs`)

### For Users

1. **Autocomplete**: Start typing an address, postcode, or place name
2. **Current Location**: Click the location button (📍) to auto-detect
3. **Select**: Choose from the suggestions

### For Developers

Import and use the `LocationInput` component:

```tsx
import { LocationInput, type LocationData } from "@/components/ui/location-input";

function MyForm() {
  const [location, setLocation] = useState<LocationData | null>(null);

  return (
    <LocationInput
      value={location}
      onChange={setLocation}
      placeholder="Enter location..."
    />
  );
}
```

The `LocationData` object contains:

```typescript
{
  displayText: string;      // Short display (e.g., "SW1A 1AA")
  formattedAddress: string; // Full address from Google
  latitude: number;         // For distance calculations
  longitude: number;        // For distance calculations
  city?: string;            // Extracted city/town
  postcode?: string;        // UK postcode
}
```

## Database Schema

The `Job` model stores structured location data:

```prisma
model Job {
  location         String   // Display text (legacy + new)
  latitude         Float?   // For distance searches
  longitude        Float?   // For distance searches
  formattedAddress String?  // Full address
  city             String?  // Extracted city
  postcode         String?  // UK postcode
  
  @@index([postcode])
  @@index([city])
  @@index([latitude, longitude])
}
```

## API Considerations

### Free Tier

Google Maps Places API includes:
- **$200 free credit per month**
- Places Autocomplete: ~$2.83 per 1000 requests
- Geocoding API: ~$5 per 1000 requests

This is enough for most small-to-medium apps (~70,000 autocomplete requests/month).

### Cost Optimization

The implementation includes several optimizations:
- Only loads API when component is rendered
- Minimal field requests to reduce costs
- UK-only bias reduces irrelevant results
- Caches results where appropriate

### Future Enhancements

For production apps with high traffic:
1. **Distance-based search**: Consider PostGIS extension for true radius searches
2. **Rate limiting**: Add rate limits on location endpoints
3. **Caching**: Cache popular location lookups
4. **Alternative**: Consider Mapbox or OpenStreetMap for cost-effective alternatives

## Troubleshooting

### "Location services not configured"
- Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env.local`
- Restart the dev server after adding the variable

### "Failed to load location services"
- Verify your API key is correct
- Check that Places API is enabled in Google Cloud Console
- Check browser console for CORS or quota errors

### "Location permission denied"
- User needs to allow location access in browser
- This is a browser security feature and cannot be bypassed

### Autocomplete not working
- Verify Maps JavaScript API is enabled
- Check API key restrictions aren't blocking localhost
- Look for errors in browser console (F12)

## Security Notes

1. **API Key Restrictions**: Always restrict your API keys by domain and API
2. **Environment Variables**: Never commit API keys to git
3. **Rate Limiting**: Consider adding rate limits for production
4. **HTTPS**: Geolocation only works on HTTPS (or localhost)

## Migration from Simple Text Input

Existing jobs with text-only locations will continue to work. The system:
- Stores location text in the `location` field (backwards compatible)
- Stores structured data when available (new jobs)
- Searches both legacy text and new structured fields

To backfill existing jobs with coordinates:
1. Create a script to geocode existing locations
2. Use the Google Geocoding API
3. Update database with lat/lng/city/postcode

Example script location: `scripts/backfill-locations.ts` (to be created if needed)
