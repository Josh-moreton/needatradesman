# Bank Transfer Payment Method

## Overview

Bank transfer (BACS Direct Debit) is enabled as a payment option for high-value jobs (£5,000+) to reduce card processing fees and provide customers with a familiar payment option for large amounts.

## Business Benefits

- **Lower Fees**: BACS fees are ~1.4% lower than card fees (BACS vs 1.5% + £0.20 card fee)
- **Customer Preference**: Many customers prefer bank transfers for large amounts
- **Example Savings**: A £10,000 job saves ~£140 in processing fees

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Bank Transfer Configuration
BANK_TRANSFER_ENABLED=true
BANK_TRANSFER_MIN_AMOUNT=5000  # Minimum amount in pence (£50.00)

# Bank account details displayed to customers
BANK_TRANSFER_ACCOUNT_NAME="Need A Tradesman Ltd"
BANK_TRANSFER_SORT_CODE="XX-XX-XX"
BANK_TRANSFER_ACCOUNT_NUMBER="XXXXXXXX"
```

### Stripe Dashboard Setup

1. Navigate to: Settings → Payment methods
2. Enable "BACS Direct Debit"
3. Note: Requires UK business verification

## Technical Implementation

### Threshold Logic

Bank transfer is available when:
- Feature flag `BANK_TRANSFER_ENABLED` is `true`
- Payment amount (in pence) >= `BANK_TRANSFER_MIN_AMOUNT` (default: 5000 pence = £50)

The threshold check uses the `isBankTransferAvailable()` helper from `src/lib/feature-flags.ts`.

### Database Schema

Added `bankTransferReference` field to Job model:

```prisma
model Job {
  // ... existing fields
  
  // Bank transfer reference for manual reconciliation
  bankTransferReference String? @unique  // e.g., "NAT-JOB-XYZ123" - max 18 chars for BACS
}
```

### Reference Generation

Bank transfer references are automatically generated when a checkout session is created:

```typescript
// Format: NAT-JOB-{SHORT_ID}
// Max 18 chars for BACS reference field
function generateBankTransferReference(jobId: string): string {
    const shortId = jobId.substring(0, 8).toUpperCase();
    return `NAT-JOB-${shortId}`;
}
```

References are:
- Unique per job
- Stored in the Job model
- Included in Stripe session metadata
- Displayed to customers for payment reconciliation

### API Routes

#### Checkout Session (`/api/stripe/checkout-session`)

- Checks if deposit amount qualifies for bank transfer
- Generates unique reference if not already set
- Adds `bacs_debit` to payment method types if eligible
- Includes reference in session metadata

#### Final Payment (`/api/stripe/final-payment`)

- Checks if final payment amount qualifies for bank transfer
- Uses existing reference or generates new one if needed
- Adds `bacs_debit` to payment method types if eligible
- Includes reference in session metadata

#### Webhook Handler (`/api/stripe/webhook`)

- Detects BACS payment method type
- Logs bank transfer payments with reference
- Processes BACS payments same as card payments
- Handles both deposit and final payments

### UI Component

`BankTransferDetails` component displays:
- Bank account details (from feature flags)
- Transfer reference with copy button
- Amount to transfer
- Processing time notice (1-2 business days)

## Customer Flow

1. Customer accepts tradesperson application
2. System checks if amount qualifies for bank transfer
3. If eligible, bank transfer option appears in Stripe Checkout
4. Customer selects "Bank Transfer" payment option
5. Stripe displays BACS Direct Debit setup
6. Customer authorizes Direct Debit mandate
7. System detects payment method and logs reference
8. Payment processes via BACS (1-2 business days)
9. Webhook receives payment confirmation
10. Job proceeds as normal

## Payment Processing Timeline

### Card Payment (Instant)
- Authorization: Immediate
- Funds available: 2-7 days (Stripe standard payout schedule)

### BACS Transfer (Delayed)
- Authorization: 1-2 business days
- Payment confirmation: Webhook `checkout.session.completed` fires after BACS clears
- Funds available: Standard Stripe payout schedule

## Monitoring & Logs

Bank transfer payments are logged with:
- Job ID
- Reference number
- Payment method type (`bacs_debit`)
- Session ID

Example log:
```
INFO: BACS bank transfer payment initiated
  jobId: "clx123..."
  tradespersonId: "clx456..."
  sessionId: "cs_test_..."
  bankTransferReference: "NAT-JOB-CLX12345"
```

## Security

- References are unique per job (database constraint)
- References expire when job is completed
- Amount validation by Stripe
- BACS Direct Debit provides fraud protection
- References help prevent payment misallocation

## Testing

### Stripe Test Mode

1. Use test mode API keys
2. Enable BACS in test mode (Settings → Payment methods)
3. Use Stripe test BACS account numbers
4. Simulate successful payment in Stripe Dashboard
5. Verify webhook receives payment confirmation

### Test Scenarios

- [x] Bank transfer option appears for £5,000+ jobs
- [x] Reference generated correctly (format: NAT-JOB-XXXXXXXX)
- [x] Reference stored in database
- [x] Reference included in Stripe metadata
- [x] Webhook logs BACS payment method
- [x] Deposit and final payments both supported
- [x] Card payments still work (regression test)

## Future Enhancements

Consider these improvements in future iterations:

### Automated Reconciliation
- Integrate with bank API (Plaid, TrueLayer, Yapily)
- Auto-match payments via reference
- Webhook on incoming payment
- Auto-confirm payment without admin

### Admin Dashboard
- `/admin/payments/pending-bank-transfers` page
- List jobs awaiting bank transfer
- Show: Job ID, Customer, Amount, Reference, Days waiting
- Manual "Mark as Received" button (MVP approach)

### Customer Notifications
- Email with bank transfer instructions
- Payment received confirmation
- Processing status updates

### Open Banking
- Instant bank transfer via Open Banking APIs
- Real-time payment confirmation
- Better UX than BACS (instant vs 1-2 days)

## Troubleshooting

### Bank Transfer Not Appearing

1. Check `BANK_TRANSFER_ENABLED=true` in environment
2. Verify amount >= `BANK_TRANSFER_MIN_AMOUNT` (default: £50)
3. Confirm BACS enabled in Stripe Dashboard
4. Check Stripe account has completed UK business verification

### Reference Not Generating

1. Verify `generateBankTransferReference()` is called
2. Check database has `bankTransferReference` field
3. Run Prisma migration if needed: `pnpm prisma migrate dev`

### Webhook Not Detecting BACS

1. Check Stripe webhook is configured correctly
2. Verify `STRIPE_WEBHOOK_SECRET` is set
3. Look for payment method retrieval errors in logs
4. Confirm payment completed in Stripe Dashboard

## Related Documentation

- [Stripe Payments Overview](./README.md)
- [Stripe Connect Audit Report](./stripe-connect-audit-report.md)
- [Payment Sequence Diagrams](./sequence-diagrams.md)
- [Webhook Security](../WEBHOOK_SECURITY.md)
