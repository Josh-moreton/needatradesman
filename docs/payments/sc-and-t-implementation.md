# SC&T Payment Model Implementation Guide

**Date:** 2025-10-20  
**Status:** ✅ Implemented (Feature Flag Controlled)  
**Priority:** P1

## Overview

This document describes the implementation of the Separate Charges & Transfers (SC&T) payment model as an alternative to the current Destination Charges model.

## What Changed

### New Feature Flag

Added `FEATURE_SC_AND_T` environment variable to control which payment model is used:

- `FEATURE_SC_AND_T=false` (default): Uses Destination Charges (current model)
- `FEATURE_SC_AND_T=true`: Uses SC&T model (new model)

### New Files

1. **`src/lib/feature-flags.ts`**
   - Centralized feature flag system
   - Exports `FEATURES.USE_SC_AND_T` boolean

2. **`src/app/api/stripe/payment/create/route.ts`**
   - Future-use endpoint for creating PaymentIntents directly
   - Currently not used by main flow but available for custom integrations

3. **`src/app/api/stripe/payment/release/route.ts`**
   - **POST** endpoint to release payments to tradespeople
   - Creates Stripe Transfer after cooling-off period
   - Validates job status and charge model
   - Updates `depositTransferId`/`finalTransferId` and release timestamps

### Modified Files

1. **`src/app/api/stripe/checkout-session/route.ts`**
   - Added feature flag check
   - SC&T path: No `application_fee_amount` or `transfer_data` in payment_intent_data
   - SC&T path: Sets `chargeModel: 'SC_AND_T'` in metadata
   - Destination Charges path: Unchanged (backward compatible)

2. **`src/app/api/stripe/final-payment/route.ts`**
   - Same feature flag logic as checkout-session
   - Supports both deposit and final payment scenarios

3. **`src/app/api/stripe/webhook/route.ts`**
   - Detects charge model from PaymentIntent metadata
   - Sets `depositReleasedAt`/`finalReleasedAt` only for Destination Charges
   - Added handlers for:
     - `payment_intent.succeeded` (logs SC&T payments)
     - `transfer.created` (logs transfer releases)
     - `charge.refunded` (logs refunds)

4. **`.env.example`**
   - Added `FEATURE_SC_AND_T=false` with documentation

## How It Works

### Destination Charges (Current - Default)

```
Customer Pays
    ↓
Stripe Checkout Session
    ↓
PaymentIntent with transfer_data
    ↓
Money splits automatically:
  - Platform gets 10% application fee
  - Tradesperson gets 90% instantly
    ↓
Webhook: checkout.session.completed
    ↓
Job updated: depositReleasedAt = NOW
```

### SC&T Model (New - Feature Flagged)

```
Customer Pays
    ↓
Stripe Checkout Session
    ↓
PaymentIntent (NO transfer_data)
    ↓
Money held on platform account
    ↓
Webhook: payment_intent.succeeded
    ↓
Job updated: depositReleasedAt = NULL
    ↓
[Wait 24-48h or customer acceptance]
    ↓
Call /api/stripe/payment/release
    ↓
Create Transfer:
  - Deduct 10% platform fee
  - Send 90% to tradesperson
    ↓
Webhook: transfer.created
    ↓
Job updated: depositTransferId, depositReleasedAt = NOW
```

## Key Differences

| Aspect | Destination Charges | SC&T |
|--------|-------------------|------|
| **Platform Fee** | `application_fee_amount` (Stripe Connect) | Deducted during manual Transfer |
| **Transfer Timing** | Instant (automatic) | Manual (controlled) |
| **Release Timestamp** | Set immediately | Set when transfer created |
| **Refund Before Transfer** | Requires transfer reversal | Simple charge refund |
| **Cooling-Off Period** | Not supported | Supported |
| **Milestone Payments** | Not supported | Supported |

## API Reference

### Release Payment (SC&T Only)

**Endpoint:** `POST /api/stripe/payment/release`

**Request Body:**
```json
{
  "jobId": "clx123abc",
  "paymentType": "deposit" | "final_payment"
}
```

**Response:**
```json
{
  "transferId": "tr_xyz123",
  "amount": 450.00,
  "success": true
}
```

**Errors:**
- `400` - Job not using SC&T model
- `400` - Payment already transferred
- `400` - Payment not completed yet
- `403` - Unauthorized (not customer)
- `404` - Job/tradesperson not found

## Testing Checklist

### Feature Flag Toggle Test

- [ ] Deploy with `FEATURE_SC_AND_T=false`
- [ ] Create job, accept application, pay deposit
- [ ] Verify: `chargeModel=DESTINATION_CHARGE`, `depositReleasedAt` is set immediately
- [ ] Verify: Tradesperson receives payment instantly

- [ ] Set `FEATURE_SC_AND_T=true`
- [ ] Create job, accept application, pay deposit
- [ ] Verify: `chargeModel=SC_AND_T`, `depositReleasedAt` is NULL
- [ ] Call `/api/stripe/payment/release` with `jobId` and `paymentType=deposit`
- [ ] Verify: Transfer created, `depositReleasedAt` now set, tradesperson receives payment

### Refund Scenarios

**Before Transfer (SC&T):**
- [ ] Pay deposit with SC&T
- [ ] Refund via Stripe Dashboard before calling release
- [ ] Verify: Customer refunded, tradesperson unaffected

**After Transfer (SC&T):**
- [ ] Pay deposit, release transfer
- [ ] Refund via Stripe Dashboard
- [ ] Verify: Transfer reversal created (check Stripe Dashboard)

## Rollout Plan

### Phase 1: Deploy with Feature OFF (Week 1)
- Set `FEATURE_SC_AND_T=false` in production
- Monitor for any regressions in existing flow

### Phase 2: Enable for 10% (Week 2)
- Implement traffic split logic (e.g., based on user ID hash)
- Monitor metrics:
  - Payment success rate
  - Transfer success rate
  - Error rate
  - Customer feedback

### Phase 3: Gradual Rollout (Week 3)
- Increase to 25%, 50%, 75%, 100%
- Continue monitoring

### Phase 4: Full Migration (Week 4)
- Set `FEATURE_SC_AND_T=true` for all users
- Remove old Destination Charges code (separate issue)

## Monitoring

Key metrics to track:

1. **Payment Success Rate**
   - `checkout.session.completed` webhook count
   - SC&T vs Destination Charges comparison

2. **Transfer Success Rate**
   - `transfer.created` webhook count
   - Time between payment and transfer

3. **Error Rate**
   - Failed transfers
   - Failed payments
   - 4xx/5xx responses on release endpoint

4. **Refund Rate**
   - `charge.refunded` webhook count
   - Before vs after transfer

## Future Enhancements

- [ ] Automatic cooling-off period with scheduled jobs
- [ ] Milestone payment UI and API
- [ ] Bank transfer support for high-value jobs
- [ ] Tradesperson as Merchant of Record option
- [ ] Partial refund support
- [ ] Multi-party splits for subcontractors

## Security Considerations

1. **Authorization:** Release endpoint verifies requesting user is job customer
2. **Idempotency:** Transfer IDs stored to prevent double-transfers
3. **Race Conditions:** Checks if transfer already exists before creating
4. **Webhook Validation:** All webhooks verify Stripe signature
5. **Charge Model Mismatch:** Release endpoint rejects non-SC&T jobs

## Support

For issues or questions:
- Check Stripe Dashboard for payment/transfer details
- Review webhook logs in Stripe Dashboard
- Check application logs for detailed error messages
- Refer to `/docs/payments/stripe-connect-audit-report.md` for architectural context
