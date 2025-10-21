# Resend Email Integration

This project uses [Resend](https://resend.com) for transactional email delivery, including welcome emails, job notifications, and daily/weekly job digests.

> **Architecture Decision:** See [ADR-001](./adr/001-use-resend-for-transactional-email.md) for why we use Resend for app emails and Microsoft 365 for human mailboxes.

## Table of Contents
- [Setup](#setup)
- [Email System Architecture](#email-system-architecture)
- [Email Templates](#email-templates)
- [Sending Emails](#sending-emails)
- [Email Preferences](#email-preferences)
- [Digest System](#digest-system)
- [Webhooks](#webhooks)
- [Testing](#testing)
- [Monitoring & Observability](#monitoring--observability)

---

## Setup

### Environment Variables

The following environment variables are required:

```env
# Resend API Key (automatically set by Vercel when you integrate Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Sender email address (verified domain)
EMAIL_FROM="Need A Tradesman <noreply@needatradesman.co.uk>"

# Support team email for alerts
SUPPORT_TEAM_EMAIL="support@needatradesman.co.uk"

# Base URL for email links
FRONTEND_BASE_URL=https://needatradesman.co.uk

# Resend Webhook Secret (for verifying webhook signatures)
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Cron Secret (for securing cron job endpoints)
CRON_SECRET=your_random_secret_here

# Digest send hour in UTC (default: 07 = 7:00 AM UTC)
DIGEST_SEND_HOUR_UTC=07
```

**Note:** When you link Resend with Vercel in the web console, Vercel automatically creates the `RESEND_API_KEY` environment variable.

### Vercel Integration (Recommended)

1. Go to your Vercel project settings
2. Navigate to Integrations
3. Add the Resend integration
4. Vercel will automatically set `RESEND_API_KEY` in your environment

### Manual Setup (Alternative)

If not using Vercel integration, set either:
- `RESEND_API_KEY=re_xxxxxxxxxxxxx` (preferred), or
- `EMAIL_SERVER=smtp://resend:<API_KEY>@smtp.resend.com:587`

### Domain Verification

To send emails from your domain, you need to verify it in Resend:

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your domain (`needatradesman.co.uk`)
3. Add the DNS records provided by Resend to your domain:
   - **SPF Record:** Authorizes Resend to send on your behalf
   - **DKIM Record:** Signs emails for authenticity
   - **DMARC Record:** Sets policy for failed authentication
4. Wait for verification (usually a few minutes)

**DNS Records Example:**
```
TXT @ "v=spf1 include:_spf.resend.com ~all"
TXT resend._domainkey "your-dkim-key-here"
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@needatradesman.co.uk"
```

> **Best Practice:** Consider using a subdomain like `mail.needatradesman.co.uk` for sending to isolate reputation.

---

## Email System Architecture

The email system is built around event-driven architecture with the following components:

### Core Components

1. **Event Definitions** (`src/lib/notifications/events.ts`)
   - Typed event schemas (UserRegistered, JobResponded, JobDigestReady, etc.)
   
2. **Notification Service** (`src/lib/notifications/service.ts`)
   - Routes events to appropriate email templates
   - Handles idempotency using SHA-256 hashing
   - Checks email suppressions before sending
   - Logs all sends with correlation IDs

3. **Idempotency Service** (`src/lib/notifications/idempotency.ts`)
   - Prevents duplicate emails from repeated event publishes
   - Uses hash of event type + payload as idempotency key
   - Stores all email events in database for audit trail

4. **Preference Service** (`src/lib/notifications/preferences.ts`)
   - Manages user email preferences (transactional always on, digest opt-in/out)
   - Supports digest frequency control (daily/weekly/never)
   - Filters by profession and region

5. **Suppression Service** (`src/lib/notifications/suppressions.ts`)
   - Tracks bounces, complaints, and manual unsubscribes
   - Auto-populated via Resend webhooks
   - Prevents sending to suppressed addresses

6. **Digest Service** (`src/lib/notifications/digest.ts`)
   - Queries jobs based on user preferences
   - Filters by profession categories and regions
   - Respects time windows (24h for daily, 7d for weekly)

### Database Models

- **EmailEvent:** Tracks all sent emails with status, message ID, and timestamps
- **EmailPreference:** Per-user preferences for digest frequency and filters
- **EmailSuppression:** List of emails to never send to (bounces/complaints/unsubscribes)

### Email Flow

```
Event Trigger → Idempotency Check → Suppression Check → Template Render → Resend API → Webhook Update
```

---

## Email Templates

Email templates are React components in `src/lib/emails/templates.tsx` with both HTML and plain-text versions:

Email templates are React components in `src/lib/emails/templates.tsx` with both HTML and plain-text versions:

- **WelcomeEmail** - Sent when users complete onboarding (UserRegistered event)
- **JobResponseEmail** - Sent when tradesperson applies to a job (JobResponded event)
- **DigestEmail** - Daily/weekly job digest for tradespeople (JobDigestReady event)
- **SupportAlertEmail** - Internal alerts for support team (AbuseFlagRaised event)
- **NewApplicationEmail** - Legacy template (replaced by JobResponseEmail)
- **JobStatusUpdateEmail** - Legacy template (for future use)
- **NewMessageEmail** - Legacy template (for future use)
- **PaymentConfirmationEmail** - Legacy template (for future use)

All emails use the `EmailLayout` wrapper for consistent branding and include:
- Preheader text for inbox preview
- Responsive design (max-width: 600px)
- High-contrast buttons (#3b82f6)
- Plain-text fallback
- Correlation IDs for tracing
- List-Unsubscribe headers (digest emails only)

---

## Sending Emails

### Using the Notification Service (Recommended)

The notification service handles idempotency, suppression checks, and logging automatically:

```typescript
import { emitEmailEvent, EmailEventType } from '@/lib/notifications';

// Welcome email on user registration
await emitEmailEvent({
  type: EmailEventType.USER_REGISTERED,
  userId: user.id,
  email: user.email,
  firstName: user.firstName,
  role: 'customer', // or 'tradesperson'
});

// Job response notification
await emitEmailEvent({
  type: EmailEventType.JOB_RESPONDED,
  jobId: job.id,
  jobTitle: job.title,
  customerEmail: customer.email,
  customerName: customer.firstName,
  tradespersonName: tradesperson.name,
  message: application.message,
  quote: application.quote,
});

// Support alert
await emitEmailEvent({
  type: EmailEventType.ABUSE_FLAG_RAISED,
  entityType: 'job',
  entityId: job.id,
  reason: 'Spam content',
  details: 'Job contains suspicious links',
  reportedBy: reporter.id,
});
```

### Direct Sending (Legacy)

For backward compatibility, you can still use the legacy send functions:

### Example: Send New Application Email

```typescript
import { sendNewApplicationEmail } from '@/lib/emails/send';

await sendNewApplicationEmail({
  customerEmail: 'customer@example.com',
  customerName: 'John',
  tradespersonName: 'Jane Doe',
  jobId: 'job_123',
  jobTitle: 'Kitchen Renovation',
  message: 'I have 10 years of experience...',
  quote: 5000,
});
```

### Example: Send Welcome Email

```typescript
import { sendWelcomeEmail } from '@/lib/emails/send';

await sendWelcomeEmail({
  userEmail: 'user@example.com',
  userName: 'John',
  userRole: 'customer', // or 'tradesperson'
});
```

## Integration Points

Consider integrating emails at these key points in your application:

### 1. New Applications
**File:** `src/app/api/applications/route.ts`

```typescript
// After creating application
const application = await prisma.application.create({ /* ... */ });

// Send notification to customer
await sendNewApplicationEmail({
  customerEmail: job.customer.email,
  customerName: job.customer.firstName,
  tradespersonName: `${user.firstName} ${user.lastName}`,
  jobId: job.id,
  jobTitle: job.title,
  message: application.message,
  quote: application.quote ? Number(application.quote) : undefined,
});
```

### 2. Job Status Updates
**File:** `src/app/api/jobs/[id]/status/route.ts`

```typescript
// After updating job status
await sendJobStatusUpdateEmail({
  userEmail: tradesperson.email,
  userName: tradesperson.firstName,
  jobId: job.id,
  jobTitle: job.title,
  status: 'In Progress',
  message: 'The customer has accepted your application!',
});
```

### 3. New Messages
**File:** `src/app/api/messages/route.ts`

```typescript
// After creating message
await sendNewMessageEmail({
  recipientEmail: receiver.email,
  recipientName: receiver.firstName,
  senderName: sender.firstName,
  jobId: message.jobId,
  jobTitle: job.title,
  messagePreview: message.content,
});
```

### 4. Payment Confirmations
**File:** `src/app/api/stripe/webhook/route.ts`

```typescript
// After successful payment
if (event.type === 'payment_intent.succeeded') {
  await sendPaymentConfirmationEmail({
    userEmail: customer.email,
    userName: customer.firstName,
    jobId: jobId,
    jobTitle: job.title,
    amount: paymentIntent.amount / 100,
    paymentType: 'deposit', // or 'final'
  });
}
```

### 5. User Onboarding
**File:** `src/app/api/user/role/route.ts`

```typescript
// After user completes onboarding
await sendWelcomeEmail({
  userEmail: user.email,
  userName: user.firstName,
  userRole: role === 'TRADESPERSON' ? 'tradesperson' : 'customer',
});
```

## Testing

### Test Endpoint

A test endpoint is available at `/api/emails/welcome` (POST) that sends a welcome email to the current user.

```bash
# Test with curl (requires authentication)
curl -X POST http://localhost:3000/api/emails/welcome \
  -H "Content-Type: application/json"
```

### Development Mode

In development, Resend emails are sent to the email addresses you specify. Make sure to:

1. Use valid email addresses
2. Check spam folders if emails don't arrive
3. Monitor the [Resend Dashboard](https://resend.com/emails) for delivery status

### Production Considerations

1. **Rate Limits:** Resend free tier has limits. Monitor usage in the dashboard.
2. **Error Handling:** All email functions return `{ success: boolean, error?: string }` - handle failures gracefully.
3. **Async Sending:** Email sending is async - don't block critical user flows waiting for emails.
4. **Logging:** Email sending errors are logged to console. Consider adding more robust logging in production.

## Customization

### Creating New Templates

1. Add a new React component to `src/lib/emails/templates.tsx`:

```typescript
export const CustomEmail: React.FC<CustomEmailProps> = ({ prop1, prop2 }) => (
  <EmailLayout>
    <h2>Your Custom Email</h2>
    <p>Hello {prop1}!</p>
    {/* Your content */}
  </EmailLayout>
);
```

2. Add a helper function in `src/lib/emails/send.ts`:

```typescript
export async function sendCustomEmail(params: CustomEmailParams): Promise<SendEmailResult> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.email,
      subject: 'Your Subject',
      react: React.createElement(CustomEmail, { /* props */ }),
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending custom email:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
```

### Styling

Emails use inline styles for maximum compatibility. The base layout includes:

- Responsive container (max-width: 600px)
- Light background (#f8f9fa)
- Primary color (#3b82f6)
- Rounded corners and proper spacing

Modify `EmailLayout` in `templates.tsx` to adjust the base styling.

---

## Email Preferences

Users can manage their email preferences through the API:

### Get Preferences

```bash
GET /api/emails/preferences
```

Returns:
```json
{
  "allowTransactional": true,
  "allowDigest": true,
  "digestFrequency": "WEEKLY",
  "professionFilters": ["PLUMBING", "ELECTRICAL"],
  "regionFilters": ["London", "Manchester"]
}
```

### Update Preferences

```bash
PUT /api/emails/preferences
Content-Type: application/json

{
  "allowDigest": true,
  "digestFrequency": "DAILY",
  "professionFilters": ["CARPENTRY"],
  "regionFilters": ["Birmingham"]
}
```

**Notes:**
- `allowTransactional` is always `true` and cannot be disabled (required for account security)
- `digestFrequency` options: `DAILY`, `WEEKLY`, `NEVER`
- Profession filters use `JobCategory` enum values
- Region filters match against city, postcode, or location fields

### Unsubscribe

Users can unsubscribe from digest emails via:
- **One-click:** GET `/api/emails/unsubscribe?userId=xxx&type=digest`
- **POST:** POST `/api/emails/unsubscribe?userId=xxx&type=digest` (List-Unsubscribe-Post header)

Both return an HTML confirmation page.

---

## Digest System

The digest system sends daily or weekly job summaries to tradespeople.

### How It Works

1. **Cron Jobs** run at 07:00 UTC:
   - Daily: Every day at 07:00 UTC
   - Weekly: Every Monday at 07:00 UTC

2. **Query Jobs** based on:
   - User's profession (from `user.trades` or `emailPreference.professionFilters`)
   - User's regions (from `emailPreference.regionFilters`)
   - Time window (24h for daily, 7d for weekly)
   - Only OPEN status jobs

3. **Filter Recipients:**
   - Only tradespeople (`role: 'TRADESPERSON'`)
   - `allowDigest: true`
   - `digestFrequency` matches the job frequency

4. **Send Digest:**
   - Skip if no jobs found
   - Include up to 10 jobs (daily) or 15 jobs (weekly)
   - Include List-Unsubscribe header

### Cron Configuration

Defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 7 * * 1"
    }
  ]
}
```

### Manual Trigger (Development)

```bash
# Trigger daily digest
curl http://localhost:3000/api/cron/daily-digest

# Trigger weekly digest
curl http://localhost:3000/api/cron/weekly-digest
```

**Production:** Set `CRON_SECRET` env var and include `Authorization: Bearer <CRON_SECRET>` header.

---

## Webhooks

Resend webhooks automatically handle bounces and complaints.

### Endpoint

**URL:** `https://needatradesman.co.uk/api/emails/webhook`

**Method:** POST

**Events Handled:**
- `email.bounced` → Add to suppression list (reason: BOUNCE)
- `email.complained` → Add to suppression list (reason: COMPLAINT)
- `email.delivered` → Update email event status to SENT
- `email.opened` → Track engagement (optional)
- `email.clicked` → Track engagement (optional)

### Setup in Resend

1. Go to [Resend Webhooks](https://resend.com/webhooks)
2. Click "Add Webhook"
3. Set URL: `https://needatradesman.co.uk/api/emails/webhook`
4. Select events: `email.bounced`, `email.complained`, `email.delivered`
5. Copy webhook signing secret to `RESEND_WEBHOOK_SECRET` env var

### Signature Verification

The webhook endpoint verifies the Svix signature. To implement full verification:

```typescript
import { Webhook } from 'svix';

const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
const payload = wh.verify(body, headers);
```

### Suppression Logic

When a bounce or complaint is received:
1. Extract email address from event data
2. Find user by email (if exists)
3. Create `EmailSuppression` record
4. Future emails to this address will be blocked

---

## Monitoring & Observability

### Database Tables

**EmailEvent** - Audit trail of all sent emails:
- `idempotencyKey` - SHA-256 hash (event type + payload)
- `eventType` - Which event triggered the email
- `status` - PENDING, SENT, FAILED, SUPPRESSED
- `messageId` - Resend message ID for tracking
- `recipientEmail` - Who received it
- `createdAt`, `sentAt` - Timestamps

**EmailPreference** - User preferences:
- `userId` - Foreign key to User
- `allowDigest` - Opt-in/out for digests
- `digestFrequency` - DAILY, WEEKLY, NEVER
- `professionFilters`, `regionFilters` - Digest filters

**EmailSuppression** - Blocked emails:
- `email` - Email address to suppress
- `reason` - BOUNCE, COMPLAINT, MANUAL_UNSUBSCRIBE, ABUSE
- `source` - Where it came from (e.g., "resend_webhook")

### Structured Logging

All email sends include correlation IDs:
```
[Email] Event already processed: abc123def456
[Email] Sent welcome email: messageId=msg_abc123, userId=user_xyz
```

Search logs by:
- `idempotencyKey` - Find duplicate sends
- `messageId` - Track specific email
- `recipientEmail` - All emails to a user

### Resend Dashboard

Monitor in [Resend Dashboard](https://resend.com/emails):
- Delivery rates
- Bounce/complaint rates
- Open/click rates (if tracking enabled)
- Search by recipient email

### Metrics to Track

- **Send Success Rate:** `(SENT emails) / (total emails) * 100`
- **Bounce Rate:** `(BOUNCE suppressions) / (total sends) * 100`
- **Complaint Rate:** `(COMPLAINT suppressions) / (total sends) * 100`
- **Digest Engagement:** Track opens/clicks (optional)

---

## Troubleshooting

### Emails Not Sending

1. Check `RESEND_API_KEY` is set correctly
2. Verify domain in Resend dashboard
3. Check email event table for error messages
4. Look for suppression records for the recipient
5. Check Resend dashboard for API errors

### Emails Going to Spam

1. Verify SPF, DKIM, and DMARC records are correct
2. Use [Mail Tester](https://www.mail-tester.com/) to check spam score
3. Avoid spammy language (ALL CAPS, excessive !!!)
4. Include unsubscribe link in digest emails
5. Maintain low bounce/complaint rates (<2%)

### Duplicate Emails

- Idempotency should prevent duplicates
- Check `EmailEvent` table for existing idempotency key
- Review event emission code for retry logic
- Ensure events have unique payloads

### Digest Not Sending

1. Check cron job is configured in `vercel.json`
2. Verify `CRON_SECRET` is set in production
3. Check user has `allowDigest: true` and appropriate `digestFrequency`
4. Verify jobs exist matching user's filters
5. Check cron logs: `/api/cron/daily-digest` returns stats

---

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend React Email](https://resend.com/docs/send-with-react)
- [Email Best Practices](https://resend.com/docs/knowledge-base/best-practices)
