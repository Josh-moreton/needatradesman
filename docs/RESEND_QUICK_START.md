# Resend Integration - Quick Start

## ✅ What's Been Added

### 1. Package Installed
- `resend` (v6.2.0) - Official Resend SDK

### 2. Core Files Created

#### `src/lib/resend.ts`
- Initializes Resend client with API key from `EMAIL_SERVER` env variable
- Exports `resend` client and `FROM_EMAIL` constant

#### `src/lib/emails/templates.tsx`
- React email templates for:
  - **NewApplicationEmail** - Notify customers of new applications
  - **JobStatusUpdateEmail** - Inform users of job status changes
  - **NewMessageEmail** - Alert users of new messages
  - **PaymentConfirmationEmail** - Confirm successful payments
  - **WelcomeEmail** - Welcome new users after onboarding

#### `src/lib/emails/send.ts`
- Helper functions for sending emails:
  - `sendNewApplicationEmail()`
  - `sendJobStatusUpdateEmail()`
  - `sendNewMessageEmail()`
  - `sendPaymentConfirmationEmail()`
  - `sendWelcomeEmail()`

#### `src/app/api/emails/welcome/route.ts`
- Example API endpoint demonstrating email usage
- POST `/api/emails/welcome` - Sends welcome email to authenticated user

### 3. Documentation

#### `docs/RESEND_INTEGRATION.md`
- Complete integration guide
- Email template customization
- Integration points in your application
- Testing instructions
- Production considerations

## 🚀 Next Steps

### 1. Verify Domain in Resend (Required for Production)

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add domain: `needatradesman.co.uk`
3. Add DNS records to your domain
4. Wait for verification

### 2. Integrate Into Your Application

Add email notifications at key touchpoints:

**New Application Created** - `src/app/api/applications/route.ts`
```typescript
await sendNewApplicationEmail({
  customerEmail: job.customer.email,
  customerName: job.customer.firstName || 'Customer',
  tradespersonName: `${user.firstName} ${user.lastName}`,
  jobId: job.id,
  jobTitle: job.title,
  message: application.message,
  quote: application.quote ? Number(application.quote) : undefined,
});
```

**User Completes Onboarding** - `src/app/api/user/role/route.ts`
```typescript
await sendWelcomeEmail({
  userEmail: user.email,
  userName: user.firstName || 'there',
  userRole: role === 'TRADESPERSON' ? 'tradesperson' : 'customer',
});
```

**Payment Successful** - `src/app/api/stripe/webhook/route.ts`
```typescript
if (event.type === 'payment_intent.succeeded') {
  await sendPaymentConfirmationEmail({
    userEmail: customer.email,
    userName: customer.firstName || 'Customer',
    jobId: metadata.jobId,
    jobTitle: job.title,
    amount: paymentIntent.amount / 100,
    paymentType: metadata.paymentType as 'deposit' | 'final',
  });
}
```

### 3. Test the Integration

```bash
# Start dev server
pnpm dev

# Test welcome email endpoint (requires authentication)
curl -X POST http://localhost:3000/api/emails/welcome \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Check the [Resend Dashboard](https://resend.com/emails) to see sent emails.

## 📝 Environment Variables

Already configured in `.env`:
```env
# Automatically set by Vercel when you link Resend integration
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Alternative fallback format
EMAIL_SERVER=smtp://resend:YOUR_API_KEY@smtp.resend.com:587

# Sender email
EMAIL_FROM=noreply@needatradesman.co.uk
```

**✅ Vercel Integration:** When you linked Resend in the Vercel console, it automatically created the `RESEND_API_KEY` environment variable. Our code uses this variable first, with `EMAIL_SERVER` as a fallback.

## 🎨 Customization

To create new email templates:

1. Add component to `src/lib/emails/templates.tsx`
2. Add helper function to `src/lib/emails/send.ts`
3. Call from your API routes or server components

## 📖 Full Documentation

See `docs/RESEND_INTEGRATION.md` for:
- Complete API reference
- All integration points
- Testing strategies
- Production best practices
- Troubleshooting

## ✨ Features

- ✅ React-based email templates
- ✅ Inline styles for email compatibility
- ✅ Consistent branding across all emails
- ✅ Type-safe with TypeScript
- ✅ Error handling built-in
- ✅ Easy to customize and extend
- ✅ Works with existing Clerk authentication
- ✅ Integrates with Prisma data models

## 🔗 Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend Dashboard](https://resend.com/dashboard)
- [React Email](https://react.email)
