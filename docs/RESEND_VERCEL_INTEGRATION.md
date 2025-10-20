# Resend + Vercel Integration

## ✅ Automatic Setup

When you link Resend with Vercel through the web console, Vercel automatically:

1. Creates a `RESEND_API_KEY` environment variable in your project
2. Syncs it across all environments (Development, Preview, Production)
3. Manages key rotation and security

## 🔧 How Our Code Works

The code in `src/lib/resend.ts` is smart about finding the API key:

```typescript
// Priority 1: Use RESEND_API_KEY (Vercel integration)
let apiKey = process.env.RESEND_API_KEY;

// Priority 2: Fall back to EMAIL_SERVER format
if (!apiKey && process.env.EMAIL_SERVER) {
  // Extract from: smtp://resend:<API_KEY>@smtp.resend.com:587
  apiKey = extractFromEmailServer();
}
```

### Why This Approach?

- **✅ Works with Vercel integration** - Uses `RESEND_API_KEY` automatically
- **✅ Backwards compatible** - Still works with `EMAIL_SERVER` format
- **✅ Flexible** - Works in local dev and production
- **✅ No code changes needed** - Just deploy and it works!

## 🚀 Deployment Checklist

### On Vercel

1. **Link Resend Integration**
   - Go to Vercel Project → Settings → Integrations
   - Add Resend integration
   - Authorize the connection
   - ✅ Done! `RESEND_API_KEY` is automatically set

2. **Verify Environment Variables**
   - Go to Settings → Environment Variables
   - Check that `RESEND_API_KEY` exists
   - Also ensure `EMAIL_FROM` is set: `noreply@needatradesman.co.uk`

3. **Deploy**
   - Push to your Git repository
   - Vercel will automatically deploy with the correct env vars

### Local Development

Your `.env` file should have:

```env
# Option 1: Direct API key (matches Vercel)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Option 2: SMTP format (fallback)
EMAIL_SERVER=smtp://resend:re_xxxxxxxxxxxxx@smtp.resend.com:587

# Required: Sender email
EMAIL_FROM=noreply@needatradesman.co.uk
```

## 🔐 Security Notes

### Environment Variables

- `RESEND_API_KEY` is automatically managed by Vercel
- Never commit your actual API key to Git
- The `.env` file is in `.gitignore`

### API Key Rotation

If you need to rotate your Resend API key:

1. Generate new key in [Resend Dashboard](https://resend.com/api-keys)
2. If using Vercel integration:
   - The integration handles this automatically
3. If setting manually:
   - Update `RESEND_API_KEY` in Vercel environment variables
   - Redeploy your application

## 🧪 Testing

### Verify Integration

1. **Check Environment Variables**
   ```bash
   # In Vercel console, run:
   echo $RESEND_API_KEY
   ```

2. **Test Email Sending**
   - Use the test endpoint: `POST /api/emails/welcome`
   - Check [Resend Dashboard](https://resend.com/emails) for sent emails

3. **Monitor Logs**
   - Vercel logs will show any Resend errors
   - Check for "Missing Resend API key" errors

## 📊 Resend Dashboard

Monitor your email sending:

- **Emails**: https://resend.com/emails
- **API Keys**: https://resend.com/api-keys
- **Domains**: https://resend.com/domains
- **Analytics**: https://resend.com/analytics

## 🆘 Troubleshooting

### "Missing Resend API key" Error

**Cause:** Neither `RESEND_API_KEY` nor `EMAIL_SERVER` is set

**Fix:**
1. Check Vercel environment variables
2. Verify Resend integration is active
3. Redeploy the application

### Emails Not Sending

**Cause:** Domain not verified in Resend

**Fix:**
1. Go to https://resend.com/domains
2. Add `needatradesman.co.uk`
3. Configure DNS records
4. Wait for verification (usually < 5 minutes)

### Local Development Issues

**Cause:** `.env` file missing variables

**Fix:**
```bash
# Add to .env
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=noreply@needatradesman.co.uk
```

## 🔗 Resources

- [Vercel Resend Integration](https://vercel.com/integrations/resend)
- [Resend Documentation](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/dashboard)
