# Payment System Documentation

This directory contains comprehensive documentation for the Need A Tradesman payment system, powered by Stripe Connect.

---

## Quick Links

- **[Audit Report](./stripe-connect-audit-report.md)** - Current state analysis and recommendations
- **[Decision Log](./decision-log.md)** - Architectural decisions and rationale
- **[Sequence Diagrams](./sequence-diagrams.md)** - Visual flow diagrams
- **[Change Plan](./change-plan.md)** - Step-by-step migration plan
- **[Bank Transfer](./bank-transfer.md)** - BACS Direct Debit payment method for high-value jobs

---

## Executive Summary

### Current State: ⚠️ Functional but Not Optimal

The platform uses **Stripe Connect (Express) with Destination Charges**:
- ✅ Works for single-stage deposit + final payments
- ✅ Platform fees (10%) collected correctly
- ✅ Webhook idempotency implemented
- ❌ No milestone payment support
- ❌ No payout control (instant transfers)
- ❌ Missing `transfer_group` for reconciliation

### Recommended State: Separate Charges & Transfers (SC&T)

Migrate to **SC&T model** for:
- ✅ Controlled payout timing (24-48h cooling-off)
- ✅ Milestone payment support
- ✅ Better reconciliation via `transfer_group`
- ✅ Refund flexibility (before vs after transfer)
- ✅ Future-proof for complex workflows

### Migration Status

| Phase | Status | Duration | Risk |
|-------|--------|----------|------|
| **Phase 0:** Quick Fixes | 🟡 Ready | 1 day | Low |
| **Phase 1:** SC&T Implementation | 🔴 Not Started | 5 days | Medium |
| **Phase 2:** Gradual Rollout | 🔴 Planned | 1 week | Low |
| **Phase 3:** Full Migration | 🔴 Planned | 3 days | Low |

**Total Effort:** 2-3 weeks  
**Recommended Start:** Q4 2025

---

## Document Guide

### 1. [Stripe Connect Audit Report](./stripe-connect-audit-report.md)

**Purpose:** Comprehensive analysis of current implementation vs. best practices

**Contents:**
- Current architecture breakdown
- Payment flow analysis (deposit, final, completion)
- Data model review
- Gap analysis
- Cost-benefit analysis
- Go/no-go recommendation

**Read this first** to understand the current state and why changes are needed.

---

### 2. [Decision Log](./decision-log.md)

**Purpose:** Record key architectural decisions for future reference

**Contents:**
- **Decision 1:** Charge Model (Destination → SC&T)
- **Decision 2:** Merchant of Record (Platform MoR)
- **Decision 3:** Payout Policy (24-48h hold)
- **Decision 4:** Platform Fee (10%)
- **Decision 5:** Payment Methods (Card, Bank Transfer, BNPL)
- **Decision 6:** Milestone Structure
- **Decision 7:** Refund Policy
- **Decision 8:** Dispute Handling
- **Decision 9:** Statement Descriptors
- **Decision 10:** Webhook Configuration

**Use this** when questioning "why did we make this choice?"

---

### 3. [Sequence Diagrams](./sequence-diagrams.md)

**Purpose:** Visual representation of payment flows

**Contents:**
- Current deposit flow (Destination Charges)
- Recommended deposit flow (SC&T)
- Milestone payment flow
- Refund flow (before/after transfer)
- Dispute handling flow
- Final payment flow
- Complete job lifecycle

**Use this** to understand how money flows through the system.

---

### 4. [Change Plan](./change-plan.md)

**Purpose:** Step-by-step migration guide

**Contents:**
- **Phase 0:** Quick fixes (transfer_group, cleanup)
- **Phase 1:** SC&T implementation (5 days)
- **Phase 2:** Gradual rollout (1% → 10% → 50% → 100%)
- **Phase 3:** Full migration and cleanup
- Rollback procedures
- Risk mitigation
- Success criteria

**Use this** when ready to implement changes.

---

## Key Concepts

### Charge Models

| Model | MoR | Transfer Timing | Use Case |
|-------|-----|----------------|----------|
| **Direct Charges** | Tradesperson | N/A (direct to tradesperson) | Simple, low control |
| **Destination Charges** | Platform | Instant (automatic) | Current implementation |
| **SC&T** | Platform | Controlled (manual) | Recommended |

### transfer_group

**Purpose:** Link related payments for reconciliation

**Example:**
```typescript
// All payments for job_xyz
transfer_group: "job_xyz"

// Query Stripe API:
stripe.charges.list({ transfer_group: "job_xyz" })
// Returns: deposit charge, milestone charges, final charge

stripe.transfers.list({ transfer_group: "job_xyz" })
// Returns: all transfers for this job
```

### Merchant of Record (MoR)

**Who appears on customer's statement and handles VAT/invoices**

- **Platform MoR:** "NEEDATRADESMAN.COM" (current/recommended)
- **Tradesperson MoR:** "[Tradesperson Name]" (future option)

---

## Current Implementation Details

### Code Locations

**Stripe Configuration:**
- `src/lib/stripe.ts` - Client instance, fee calculations

**API Routes:**
- `src/app/api/stripe/checkout-session/route.ts` - Deposit payment
- `src/app/api/stripe/final-payment/route.ts` - Final payment
- `src/app/api/stripe/webhook/route.ts` - Webhook handler
- `src/app/api/stripe/connect/onboard/route.ts` - Tradesperson onboarding
- `src/app/api/stripe/connect/status/route.ts` - Account status check
- `src/app/api/jobs/[jobId]/complete/route.ts` - Job completion

**Database:**
- `prisma/schema.prisma` - Job, Application, User models

### Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Feature Flags (future)
FEATURE_SC_AND_T=false
SC_AND_T_ROLLOUT_PERCENTAGE=0
```

### Webhook Events Handled

**Current:**
- ✅ `checkout.session.completed`
- ✅ `account.updated`

**Planned (SC&T):**
- `payment_intent.succeeded`
- `transfer.created`
- `transfer.reversed`
- `charge.refunded`
- `charge.dispute.created`

---

## Testing

### Stripe Test Mode

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3DS required: `4000 0025 0000 3155`
- Dispute: `4000 0000 0000 0259`

**Test Environment:**
```bash
# Use test keys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Test Scenarios

1. **Deposit Payment (Current)**
   - Create job, accept application
   - Pay deposit with test card
   - Verify webhook, DB updates, instant transfer

2. **Final Payment (Current)**
   - Complete job (both parties confirm)
   - Pay final with test card
   - Verify updates

3. **SC&T Flow (Future)**
   - Pay deposit (funds held)
   - Wait 48h or manual release
   - Verify transfer created

4. **Refund (Future)**
   - Before transfer: full refund
   - After transfer: partial refund with reversal

---

## Common Issues & Solutions

### Issue 1: Payment Intent Metadata Missing

**Symptom:** Webhook can't find job

**Solution:** Ensure metadata on PaymentIntent, not just Session
```typescript
payment_intent_data: {
    metadata: {
        jobId: job.id,
        // ... other fields
    },
}
```

### Issue 2: Double Transfer

**Symptom:** Tradesperson receives 2x amount

**Solution:** Check `depositReleased` flag before transfer
```typescript
if (job.depositReleased) {
    // Skip, already done
}
```

### Issue 3: Transfer_group Missing

**Symptom:** Can't reconcile payments in Stripe

**Solution:** Add to all PaymentIntents
```typescript
transfer_group: `job_${jobId}`
```

---

## Monitoring & Alerts

### Key Metrics

1. **Payment Success Rate:** >95%
2. **Transfer Success Rate:** >99%
3. **Time to Release:** 24-48h average
4. **Dispute Rate:** <1%
5. **Refund Rate:** <5%

### Alert Thresholds

- Payment success <95%: Warning
- Transfer failures >10/day: Critical
- Pending releases >72h: Warning
- Disputes >5/day: Investigate

---

## Roadmap

### Q4 2025: Foundation
- [x] Audit current implementation
- [ ] Phase 0: Quick fixes (1 day)
- [ ] Phase 1: SC&T implementation (5 days)
- [ ] Phase 2: Gradual rollout (1 week)
- [ ] Phase 3: Full migration (3 days)

### Q1 2026: Milestone Payments
- [ ] Schema updates (Milestone model)
- [ ] API routes (pay, approve, release)
- [ ] UI components
- [ ] Testing

### Q2 2026: Enhanced Payment Methods
- [x] GBP Bank Transfer (BACS) for high-value jobs
- [ ] BNPL integration (3-5 days)
- [ ] Apple Pay / Google Pay optimization

### Q3 2026: Advanced Features
- [ ] Tradesperson MoR option (Direct Charges)
- [ ] Multi-party splits (referrals, insurance)
- [ ] Subscription model for tradespeople
- [ ] Dynamic fee structure

---

## FAQ

### Q: Why migrate from Destination Charges?

**A:** Destination Charges work but have limitations:
- No payout control (instant transfer)
- Cannot support complex milestone workflows
- Harder to handle refunds/disputes
- No transfer_group support

SC&T gives us flexibility for future features.

---

### Q: Will migration cause downtime?

**A:** No. We use feature flags for gradual rollout:
1. Implement SC&T alongside current system
2. Enable for 1% of users
3. Gradually increase to 100%
4. Remove old code

---

### Q: What if SC&T fails?

**A:** We can rollback instantly by disabling feature flag:
```bash
FEATURE_SC_AND_T=false
```
Old Destination Charge code remains active until fully tested.

---

### Q: How long until milestone payments?

**A:** After SC&T migration:
- SC&T foundation: 2-3 weeks
- Milestone implementation: 3-5 days
- Total: ~4 weeks

---

### Q: Will tradespeople see any changes?

**A:** Two visible changes:
1. **Payout timing:** 24-48h delay (vs instant)
2. **Clear messaging:** "Payment pending release"

We'll notify tradespeople before rollout.

---

## Support

### For Developers
- Read audit report first
- Review sequence diagrams
- Follow change plan for implementation
- Test in Stripe test mode extensively

### For Product/Business
- Review decision log for rationale
- Understand payout timing changes
- Plan customer/tradesperson communications
- Define milestone payment rules

### For Support Team
- Understand new payout timing
- Know how to check transfer status
- Escalation path for stuck transfers
- FAQ for customers/tradespeople

---

## References

### Stripe Documentation
- [Connect Overview](https://stripe.com/docs/connect)
- [Separate Charges & Transfers](https://stripe.com/docs/connect/charges-transfers)
- [PaymentIntents](https://stripe.com/docs/payments/payment-intents)
- [Webhooks](https://stripe.com/docs/webhooks)

### Internal
- [Main README](../../README.md)
- [API Documentation](../API.md)
- [Testing Guide](../TESTING_GUIDE.md)

---

**Last Updated:** 2025-10-19  
**Maintained By:** Engineering Team  
**Version:** 1.0  
**Status:** Documentation Complete - Implementation Pending
