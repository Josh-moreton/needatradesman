# SC&T Payment Flow Diagrams

## Destination Charges (Current Model - Default)

```
┌──────────────────────────────────────────────────────────────────┐
│                    DESTINATION CHARGES FLOW                       │
└──────────────────────────────────────────────────────────────────┘

Customer                    Platform                    Tradesperson
   │                           │                              │
   │ 1. Pay £1000             │                              │
   ├──────────────────────────>│                              │
   │                           │                              │
   │                           │ 2. Stripe splits instantly   │
   │                           │    - Platform: £100 (fee)   │
   │                           │    - Tradesperson: £900      │
   │                           ├─────────────────────────────>│
   │                           │                              │
   │ 3. Webhook: checkout.session.completed                  │
   │                           │                              │
   │                           │ 4. Update DB:                │
   │                           │    depositPaid = true        │
   │                           │    depositReleasedAt = NOW   │
   │                           │    chargeModel = DESTINATION │
   │                           │                              │
   │<── Payment Success ───────┤                              │
   │                           │                              │
   
Timeline: Instant transfer (0-5 minutes)
Refund: Requires transfer reversal from tradesperson
```

## SC&T Model (New - Feature Flagged)

```
┌──────────────────────────────────────────────────────────────────┐
│              SEPARATE CHARGES & TRANSFERS FLOW                    │
└──────────────────────────────────────────────────────────────────┘

Customer                    Platform                    Tradesperson
   │                           │                              │
   │ 1. Pay £1000             │                              │
   ├──────────────────────────>│                              │
   │                           │                              │
   │                           │ 2. Hold full £1000          │
   │                           │    (NO instant transfer)     │
   │                           │                              │
   │ 3. Webhook: payment_intent.succeeded                    │
   │                           │                              │
   │                           │ 4. Update DB:                │
   │                           │    depositPaid = true        │
   │                           │    depositReleasedAt = NULL  │
   │                           │    chargeModel = SC_AND_T    │
   │                           │                              │
   │<── Payment Success ───────┤                              │
   │                           │                              │
   │        ⏱️  COOLING-OFF PERIOD (24-48h)                   │
   │                           │                              │
   │ 5. Confirm work OR        │                              │
   │    Auto-release timer     │                              │
   │                           │                              │
   │                           │ 6. POST /api/stripe/         │
   │                           │    payment/release           │
   │                           │                              │
   │                           │ 7. Create Transfer:          │
   │                           │    Amount: £900              │
   │                           │    (£100 platform fee kept)  │
   │                           ├─────────────────────────────>│
   │                           │                              │
   │ 8. Webhook: transfer.created                            │
   │                           │                              │
   │                           │ 9. Update DB:                │
   │                           │    depositTransferId = "tr_" │
   │                           │    depositReleasedAt = NOW   │
   │                           │                              │
   
Timeline: Controlled (24-48h + manual release)
Refund before transfer: Simple charge refund (no tradesperson impact)
Refund after transfer: Requires transfer reversal
```

## Feature Flag Branching

Note: Environment variable is `FEATURE_SC_AND_T`, accessed in code as `FEATURES.USE_SC_AND_T`

```
┌────────────────────────────────────────────────────────┐
│         Customer initiates payment                      │
└────────────────────┬───────────────────────────────────┘
                     │
                     │
         ┌───────────▼───────────┐
         │ FEATURES.USE_SC_AND_T?│
         │  (env: FEATURE_SC_AND │
         │       _T)              │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────┐            ┌─────▼─────┐
    │  FALSE  │            │   TRUE    │
    │(default)│            │           │
    └────┬────┘            └─────┬─────┘
         │                       │
         │                       │
    ┌────▼─────────────┐    ┌────▼──────────────┐
    │ Destination      │    │ SC&T Model        │
    │ Charges          │    │                   │
    │                  │    │                   │
    │ - transfer_data  │    │ - NO transfer     │
    │ - app fee        │    │ - transfer_group  │
    │ - instant        │    │ - manual release  │
    └──────────────────┘    └───────────────────┘
```

## API Endpoints

### Existing (Both Models)
- `POST /api/stripe/checkout-session` - Create payment session for deposit
- `POST /api/stripe/final-payment` - Create payment session for final payment
- `POST /api/stripe/webhook` - Handle Stripe events

### New (SC&T Only)
- `POST /api/stripe/payment/release` - Manually release transfer to tradesperson

```
POST /api/stripe/payment/release
{
  "jobId": "clx123abc",
  "paymentType": "deposit" | "final_payment"
}

Response:
{
  "transferId": "tr_xyz123",
  "amount": 450.00,
  "success": true
}
```

## Database State Transitions

### Deposit Payment

**Destination Charges:**
```
INITIAL STATE:
  depositPaid: false
  depositPaymentIntentId: null
  depositChargeId: null
  depositReleasedAt: null
  chargeModel: null

AFTER PAYMENT:
  depositPaid: true
  depositPaymentIntentId: "pi_xxx"
  depositChargeId: "ch_xxx"
  depositReleasedAt: <NOW>
  chargeModel: DESTINATION_CHARGE
```

**SC&T Model:**
```
INITIAL STATE:
  depositPaid: false
  depositPaymentIntentId: null
  depositChargeId: null
  depositReleasedAt: null
  depositTransferId: null
  chargeModel: null

AFTER PAYMENT:
  depositPaid: true
  depositPaymentIntentId: "pi_xxx"
  depositChargeId: "ch_xxx"
  depositReleasedAt: null  ← Still null!
  depositTransferId: null
  chargeModel: SC_AND_T

AFTER RELEASE:
  depositPaid: true
  depositPaymentIntentId: "pi_xxx"
  depositChargeId: "ch_xxx"
  depositReleasedAt: <NOW>  ← Set when transferred
  depositTransferId: "tr_xxx"
  chargeModel: SC_AND_T
```

## Rollout Strategy

Environment variable: `FEATURE_SC_AND_T` (accessed in code via `FEATURES.USE_SC_AND_T`)

```
Week 1: Deploy with Feature OFF
  ├─ FEATURE_SC_AND_T=false (default)
  ├─ Monitor for regressions
  └─ Verify existing flow works

Week 2: Enable for 10%
  ├─ FEATURE_SC_AND_T=true for 10% of traffic
  ├─ Monitor metrics
  └─ Gather feedback

Week 3: Gradual Increase
  ├─ 25% → 50% → 75% → 100%
  └─ Continue monitoring

Week 4: Full Migration
  ├─ FEATURE_SC_AND_T=true for all traffic
  └─ Plan removal of old code
```
