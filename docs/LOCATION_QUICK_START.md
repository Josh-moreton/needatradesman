# Quick Start: Location Services

## 🚀 For Developers - 3 Steps to Enable

### 1. Get Google Maps API Key (2 minutes)
1. Go to https://console.cloud.google.com/
2. Enable **Places API** and **Maps JavaScript API**
3. Create API Key
4. Restrict it to your domains (important!)

### 2. Add to Environment
```bash
# Create .env.local
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 3. Restart
```bash
pnpm dev
```

**Done!** Location autocomplete now works on:
- Job creation form (`/customer/jobs/new`)
- Job search filters (`/tradesperson/jobs`)

## 📖 Full Documentation
See [`docs/LOCATION_SERVICES.md`](./LOCATION_SERVICES.md) for:
- Detailed setup instructions
- Security configuration
- API costs and quotas
- Troubleshooting

## 🆘 Quick Troubleshooting

**"Location services not configured"**
→ Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env.local` and restart

**Autocomplete not working**
→ Enable Places API in Google Cloud Console

**Current location button not working**
→ Use HTTPS or localhost (browser security requirement)

## 💡 Without API Key
The app still works! Location becomes a simple text input (legacy mode).
