# Resend Email Integration

This project uses [Resend](https://resend.com) for transactional email delivery.

## Setup

### Environment Variables

The following environment variables are required (already configured in `.env`):

```env
# Resend API Key (automatically set by Vercel when you integrate Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Alternative: SMTP connection string format (fallback)
EMAIL_SERVER=smtp://resend:<API_KEY>@smtp.resend.com:587

# Sender email address
EMAIL_FROM=noreply@needatradesman.co.uk
```

**Note:** When you link Resend with Vercel in the web console, Vercel automatically creates the `RESEND_API_KEY` environment variable. Our code prioritizes this variable, but will fall back to extracting the key from `EMAIL_SERVER` if needed.

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
3. Add the DNS records provided by Resend to your domain
4. Wait for verification (usually a few minutes)

## Email Templates

Email templates are React components located in `src/lib/emails/templates.tsx`:

- **NewApplicationEmail** - Sent when a tradesperson applies to a job
- **JobStatusUpdateEmail** - Sent when a job status changes
- **NewMessageEmail** - Sent when a user receives a new message
- **PaymentConfirmationEmail** - Sent after successful payment
- **WelcomeEmail** - Sent to new users after registration

All emails use the `EmailLayout` wrapper for consistent branding.

## Sending Emails

Helper functions are available in `src/lib/emails/send.ts`:

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

## Resources

- [Resend Documentation](https://resend.com/docs)
- [Resend React Email](https://resend.com/docs/send-with-react)
- [Email Best Practices](https://resend.com/docs/knowledge-base/best-practices)
