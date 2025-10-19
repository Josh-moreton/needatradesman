# Payment Hold/Capture Flow Implementation

## Overview

This document describes the implementation of payment hold/capture functionality for deposit payments in the Need a Tradesman marketplace. This feature allows payments to be authorized (held) when a customer accepts an application, but only captured (charged) when work is confirmed to proceed.

## Benefits

- **Reduced disputes**: Customers have confidence funds won't be released until work begins
- **Better cash flow control**: Platform can manage timing of payouts
- **Fraud protection**: Identify problematic accounts before funds are transferred
- **Compliance**: Better alignment with marketplace best practices

## How It Works

### 1. Payment Authorization (Hold)

When a customer accepts a tradesperson's application:

1. Customer clicks "Accept" on an application that requires a deposit
2. Customer is prompted to pay the deposit via Stripe Checkout
3. Payment is **authorized** (held) but **not captured** (charged)
4. Job status remains `OPEN`
5. Application status changes to `ACCEPTED`
6. Other applications are set to `REJECTED`

### 2. Payment Capture (Charge)

The customer can capture (charge) the held payment in two ways:

#### Manual Capture
- Customer clicks "Release Payment" button in the UI
- Confirms they want to release the payment
- Payment is captured via `/api/stripe/capture-payment`
- Job status changes to `IN_PROGRESS`
- Funds are transferred to the tradesperson (minus platform fee)

#### Auto-Capture
- If not manually captured within 7 days, Stripe automatically captures the payment
- This is Stripe's built-in behavior for manual capture mode

### 3. Payment Cancellation

The customer can cancel the held payment if work won't proceed:

1. Customer clicks "Cancel Payment" button in the UI
2. Confirms they want to cancel the authorization
3. Payment is cancelled via `/api/stripe/cancel-payment`
4. Job status returns to `OPEN`
5. All applications reset to `PENDING`
6. No funds are charged

## Database Schema

### New Fields in `Job` Model

```prisma
depositCaptured       Boolean   @default(false)  // Payment was captured
depositCapturedAt     DateTime?                   // When payment was captured
depositCancelledAt    DateTime?                   // When payment was cancelled
```

## API Endpoints

### POST `/api/stripe/capture-payment`

Captures a held deposit payment.

**Request Body:**
```json
{
  "jobId": "clxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "capturedAt": "2025-10-19T20:30:00.000Z"
}
```

**Errors:**
- `401`: Unauthorized
- `403`: Not the job owner
- `404`: Job not found
- `400`: Deposit already captured, cancelled, or payment not in capturable state

### POST `/api/stripe/cancel-payment`

Cancels a held deposit payment.

**Request Body:**
```json
{
  "jobId": "clxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment cancelled successfully",
  "cancelledAt": "2025-10-19T20:30:00.000Z"
}
```

**Errors:**
- `401`: Unauthorized
- `403`: Not the job owner
- `404`: Job not found
- `400`: Deposit already captured, cancelled, or payment not in cancellable state

## Webhook Events

The webhook handler (`/api/stripe/webhook`) now processes additional events:

### `payment_intent.amount_capturable_updated`
- Logs when a payment becomes capturable
- No database changes (informational only)

### `payment_intent.canceled`
- Updates job status to `OPEN`
- Sets `depositCancelledAt` timestamp
- Sets `depositPaid` to `false`
- Removes `acceptedTradespersonId`

### `payment_intent.payment_failed`
- Logs payment failure
- No automatic status changes (customer must retry)

## UI Changes

### Payment Hold Status Card

When a deposit is held (authorized but not captured), a prominent yellow card is displayed:

```
┌─────────────────────────────────────────────────┐
│ Payment Held [Awaiting Capture]                │
│                                                 │
│ The deposit payment has been authorized and    │
│ is currently on hold. You can:                 │
│                                                 │
│ • Release Payment: Confirm work will proceed   │
│ • Cancel Payment: Cancel if work won't proceed │
│ • Auto-capture after 7 days if not released    │
│                                                 │
│ [Release Payment] [Cancel Payment]             │
└─────────────────────────────────────────────────┘
```

### Application Badges

Applications show status badges:
- **"Payment Held"** (yellow): Payment is authorized but not captured
- **"Payment Captured"** (green): Payment has been captured

These badges only appear for applications that require deposits.

## State Diagram

```
[OPEN] ──Accept──> [depositPaid=true, depositCaptured=false]
   │                          │
   │                          │──Capture──> [IN_PROGRESS]
   │                          │              (depositCaptured=true)
   │                          │
   │                          └──Cancel──> [OPEN]
   │                                        (depositCancelledAt set)
   └──────────────────────────────────────┘
```

## Testing

### Manual Testing Checklist

1. **Accept Application with Deposit**
   - [ ] Application status changes to ACCEPTED
   - [ ] Job status stays OPEN
   - [ ] "Payment Held" card is displayed
   - [ ] Application shows "Payment Held" badge

2. **Capture Payment**
   - [ ] Click "Release Payment"
   - [ ] Confirmation dialog appears
   - [ ] Payment is captured successfully
   - [ ] Job status changes to IN_PROGRESS
   - [ ] Badge changes to "Payment Captured"
   - [ ] "Payment Held" card disappears

3. **Cancel Payment**
   - [ ] Click "Cancel Payment"
   - [ ] Confirmation dialog appears
   - [ ] Payment is cancelled successfully
   - [ ] Job status returns to OPEN
   - [ ] Applications reset to PENDING
   - [ ] "Payment Held" card disappears

4. **Auto-Capture** (Requires waiting 7 days)
   - [ ] Payment automatically captures after 7 days
   - [ ] Job status changes to IN_PROGRESS

### Stripe Test Mode

Use Stripe test mode with test cards:
- `4242 4242 4242 4242` - Standard test card (succeeds)
- `4000 0025 0000 3155` - Requires authentication (succeeds)
- `4000 0000 0000 9995` - Declined card (fails)

## Edge Cases

### Expired Hold (7 Days)
- Stripe automatically captures after 7 days
- No additional handling needed from our side

### Failed Capture
- API returns error to customer
- Customer must retry or contact support

### Race Conditions
- Atomic transactions prevent duplicate captures
- Payment intent ID is unique per job

### Network Failures
- Idempotency keys prevent duplicate charges
- Webhook events ensure eventual consistency

## Migration Notes

### Existing Jobs
- Existing jobs with immediate capture continue to work
- Only new jobs use manual capture
- No migration needed for historical data

### Backwards Compatibility
- Jobs without deposits are unaffected
- Payment flow still works if deposit not required
- UI adapts based on `requiresDeposit` flag

## Configuration

### Stripe Settings
- Manual capture is enabled per payment intent
- 7-day capture window is Stripe's default (cannot be extended)

### Environment Variables
No new environment variables required. Uses existing:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Security Considerations

- **Authorization checks**: All endpoints verify user owns the job
- **Idempotency**: Webhook events are deduplicated
- **State validation**: Payment intent status checked before capture/cancel
- **Atomic transactions**: Database updates are transactional
- **Confirmation dialogs**: User must confirm destructive actions

## Future Enhancements

1. **Auto-capture timing**: Add configurable auto-capture delay (2-3 days instead of 7)
2. **Notifications**: Send email/SMS before auto-capture
3. **Expiry warnings**: Show countdown timer for 7-day limit
4. **Partial capture**: Support capturing partial amounts
5. **Escrow service**: Hold payments in escrow until work completes

## Related Documentation

- [Stripe Manual Capture Documentation](https://stripe.com/docs/payments/place-a-hold-on-a-payment-method)
- [Stripe Connect Charges](https://stripe.com/docs/connect/charges#captured)
- Internal: `docs/payments/stripe-connect-audit-report.md`
