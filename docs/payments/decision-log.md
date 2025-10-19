# Payment System Decision Log

**Purpose:** Record key architectural and implementation decisions for the payment system.

---

## Decision 1: Charge Model Selection

**Date:** 2025-10-19  
**Status:** 🟡 Pending Migration  
**Decision Maker:** Engineering Team

### Context

We need to choose between three Stripe Connect charge models:
1. **Direct Charges** - Charge on connected account (tradesperson MoR)
2. **Destination Charges** - Charge on platform, instant transfer (platform MoR)
3. **Separate Charges & Transfers (SC&T)** - Charge on platform, manual transfer (platform MoR)

### Current Implementation

**Destination Charges** (implemented in v1)

**Flow:**
```
Customer → Platform Account → [instant transfer] → Tradesperson Account
                ↓
           10% fee kept
```

**Code Location:** `src/app/api/stripe/checkout-session/route.ts`

### Decision

**Migrate to Separate Charges & Transfers (SC&T)** for all new payments.

### Rationale

| Criterion | Destination | SC&T | Winner |
|-----------|------------|------|--------|
| Payout Control | ❌ Instant | ✅ On-demand | SC&T |
| Milestone Support | ❌ Limited | ✅ Full | SC&T |
| Cooling-off Period | ❌ No | ✅ Yes | SC&T |
| Reconciliation | ⚠️ Harder | ✅ transfer_group | SC&T |
| Simplicity | ✅ Simpler | ⚠️ More complex | Destination |
| Multi-party | ❌ No | ✅ Future-proof | SC&T |

**Key Benefits of SC&T:**
1. Hold deposit for 24-48h cooling-off period
2. Release milestones conditionally on completion
3. Link all payments via `transfer_group: "job_${jobId}"`
4. Support complex workflows (future: insurance, referrals)
5. Better dispute handling (can refund before transfer)

**Trade-offs:**
- More code to maintain (transfer management)
- Slightly more complex than Destination Charges
- Need to handle transfer failures

### Implementation Plan

**Phase 1:** Add `transfer_group` to current Destination Charges (quick win)
**Phase 2:** Implement SC&T alongside Destination (feature flag)
**Phase 3:** Migrate existing flows to SC&T
**Phase 4:** Remove Destination Charge code

**Timeline:** 2-3 weeks

### Alternatives Considered

**Alternative 1: Keep Destination Charges**
- ❌ Rejected: Cannot support milestones properly
- ❌ No payout control
- Only viable for very simple use cases

**Alternative 2: Direct Charges (Tradesperson MoR)**
- ⚠️ Deferred: Good for future, but requires tradesperson to handle invoicing
- ⚠️ Less control over disputes
- Consider for phase 2 after SC&T stable

### References

- [Stripe: Separate Charges & Transfers](https://stripe.com/docs/connect/charges-transfers)
- [Audit Report: Section C](./stripe-connect-audit-report.md#c-recommended-model-separate-charges--transfers)

---

## Decision 2: Merchant of Record (MoR)

**Date:** 2025-10-19  
**Status:** ✅ Current: Platform MoR  
**Decision Maker:** Engineering Team

### Context

Who should be the Merchant of Record for customer payments?

**Options:**
1. **Platform MoR** - Platform appears on statement, handles VAT/invoices
2. **Tradesperson MoR** - Tradesperson appears on statement, handles VAT/invoices

### Decision

**Platform MoR for MVP**, with option to support Tradesperson MoR in future.

### Rationale

**Why Platform MoR:**
- ✅ Consistent customer experience
- ✅ Platform controls statement descriptors
- ✅ Easier dispute handling
- ✅ Better for marketplace brand trust
- ❌ Platform bears VAT/consumer protection burden
- ❌ Higher compliance requirements

**Why Not Tradesperson MoR (for now):**
- ❌ Inconsistent customer experience (different statement descriptors)
- ❌ Harder to enforce payment policies
- ❌ Some tradespeople may not be VAT registered
- ✅ But: Lower platform liability

### Implementation

**Current:** Platform MoR via Destination Charges  
**Recommended:** Platform MoR via SC&T

**Future Option:** Add Tradesperson MoR for verified, VAT-registered tradespeople using Direct Charges.

### Acceptance Criteria

- [ ] Platform appears on all customer statements
- [ ] Platform issues invoices/receipts
- [ ] Platform handles VAT (if applicable)
- [ ] Clear in T&Cs that platform is MoR

### References

- [Stripe: MoR Considerations](https://stripe.com/docs/connect/charges#merchant-of-record)

---

## Decision 3: Payout Policy

**Date:** 2025-10-19  
**Status:** 🟡 To Be Implemented (SC&T required)  
**Decision Maker:** Engineering Team + Product

### Context

When should funds be released to tradespeople?

### Decision

**Controlled Release with Cooling-off Period**

**Policy:**
1. **Deposit:** Held 24-48h after payment, then released (or on job start, whichever first)
2. **Milestones:** Released within 24h of customer approval
3. **Final Payment:** Released within 24h of both parties confirming completion
4. **Dispute:** All transfers frozen until resolved
5. **Cancellation:** Refunded per cancellation policy (time-based)

### Rationale

**Benefits:**
- ✅ Customer protection (cooling-off period)
- ✅ Platform can intervene in disputes before money moves
- ✅ Reduces chargebacks (resolve issues before payout)
- ✅ Fair to tradespeople (clear timeline)

**Trade-offs:**
- ⚠️ Tradespeople wait 24-48h for deposit
- ⚠️ Need clear communication in UX

### UX Language

**DO USE:**
- "Payment held for payout"
- "Pending release to tradesperson"
- "Payment protection period"
- "Funds will be released within 24-48 hours"

**DO NOT USE:**
- ❌ "Escrow" (implies third-party escrow service, which we're not)
- ❌ "Held indefinitely"
- ❌ Any misleading language

### Implementation Requirements

1. **SC&T model** (to support delayed transfers)
2. **Cron job** or webhook-based trigger for auto-release
3. **Manual release API** for admin overrides
4. **Clear messaging** in UI about payout timing

### Timeline for Auto-Release

```
Deposit Payment:
  T+0: Customer pays
  T+24-48h: Auto-release to tradesperson (if no issues)

Milestone:
  T+0: Customer approves milestone
  T+24h: Auto-release to tradesperson

Final Payment:
  T+0: Both parties confirm completion
  T+24h: Auto-release to tradesperson
```

### References

- [Audit Report: Section D.3](./stripe-connect-audit-report.md#3-payout-policy)

---

## Decision 4: Platform Fee Structure

**Date:** 2025-10-19  
**Status:** ✅ Implemented  
**Decision Maker:** Business Team

### Decision

**10% application fee** on all transactions.

### Implementation

```typescript
const platformFee = calculatePlatformFee(amount); // 10%
```

**Code:** `src/lib/stripe.ts:28-32`

### Rationale

- Industry standard for trade marketplaces (5-15%)
- Covers: payment processing, platform operations, support, insurance (future)
- Collected automatically via Stripe `application_fee_amount`

### Breakdown (Example: £1000 job)

```
Customer pays: £1000
Platform fee (10%): £100
Stripe fee (~2%): £20
Tradesperson net: £880
```

**Note:** Stripe fee is deducted from platform portion, not tradesperson.

### Future Considerations

- Tiered fees (smaller % for larger jobs)
- Subscription model (reduce per-transaction fee)
- Promotional periods (reduced fees for first jobs)

---

## Decision 5: Payment Methods

**Date:** 2025-10-19  
**Status:** 🟡 Card only (expand in future)  
**Decision Maker:** Engineering Team

### Current Implementation

**Enabled:**
- ✅ Card payments (all major cards)
- ✅ Apple Pay
- ✅ Google Pay

**Not Enabled:**
- ❌ GBP Bank Transfer
- ❌ BNPL (Klarna, Clearpay)
- ❌ PayPal

### Decision

**Phase 1 (MVP):** Card payments only  
**Phase 2:** Add GBP Bank Transfer for high-value jobs (>£5,000)  
**Phase 3:** Add BNPL for customer financing

### Rationale

**Phase 1: Card Only**
- ✅ Simplest to implement
- ✅ Covers 90% of use cases
- ✅ Fast checkout experience

**Phase 2: Bank Transfer**
- ✅ Needed for large jobs (£5k-£50k)
- ✅ Lower fees than cards (0.5% vs 1.4% + 20p)
- ⚠️ Manual reconciliation required
- ⚠️ Slower (2-3 days to clear)

**Phase 3: BNPL**
- ✅ Improves conversion (homeowners spread cost)
- ✅ No extra cost to platform (BNPL provider takes risk)
- ⚠️ Requires Stripe approval
- ⚠️ May encourage overspending

### Implementation Plan

**GBP Bank Transfer:**
1. Enable in Stripe Dashboard
2. Generate virtual account references per job
3. Build reconciliation process (match reference to job)
4. UI: Show bank details on acceptance
5. Webhook: Detect payment received

**BNPL:**
1. Apply for Klarna/Clearpay in Stripe Dashboard
2. Update checkout to show BNPL options
3. Handle BNPL-specific webhooks
4. Test extensively (BNPL has more edge cases)

**Estimated Effort:**
- Bank Transfer: 1-2 weeks
- BNPL: 3-5 days

### Acceptance Criteria

- [ ] Card payments work for all jobs
- [ ] Bank transfer available for jobs >£5k
- [ ] BNPL available for jobs £500-£10k (configurable)
- [ ] Clear messaging about payment method options

### References

- [Stripe: Payment Method Support](https://stripe.com/docs/payments/payment-methods)

---

## Decision 6: Milestone Payment Structure

**Date:** 2025-10-19  
**Status:** ❌ Not Implemented (Planned)  
**Decision Maker:** Engineering Team + Product

### Context

Large jobs (>£5,000) should support milestone-based payments.

### Decision

**Support milestone payments with SC&T model.**

**Structure:**
```typescript
interface MilestoneSchedule {
    deposit: number;      // e.g., 25% upfront
    milestones: {
        description: string;
        percentage: number;
        dueOnCompletion: boolean;
    }[];
    final: number;        // e.g., 10% on completion
}

// Example: £10,000 bathroom refit
{
    deposit: 2500,        // 25% upfront
    milestones: [
        { description: "Plumbing complete", percentage: 30, amount: 3000 },
        { description: "Tiling complete", percentage: 25, amount: 2500 },
        { description: "Final fixtures", percentage: 20, amount: 2000 },
    ],
    // Implicitly: final 0% held until completion
}
```

### Rationale

**Benefits:**
- ✅ Customer confidence (pay as work progresses)
- ✅ Tradesperson cash flow (get paid for completed work)
- ✅ Reduces risk for both parties
- ✅ Supports large jobs (£5k-£50k+)

**Trade-offs:**
- ⚠️ More complex workflow
- ⚠️ Requires clear milestone definitions
- ⚠️ Need dispute resolution for partial completion

### Implementation Requirements

1. **Schema:**
   ```prisma
   model Milestone {
       id              String   @id @default(cuid())
       applicationId   String
       description     String
       percentage      Int
       amount          Decimal
       status          MilestoneStatus @default(PENDING)
       paymentIntentId String?
       transferId      String?
       paidAt          DateTime?
       releasedAt      DateTime?
       
       application Application @relation(...)
   }
   
   enum MilestoneStatus {
       PENDING        // Not yet paid
       PAID           // Customer paid, held by platform
       RELEASED       // Transferred to tradesperson
       DISPUTED       // Issue raised
       CANCELLED      // Job cancelled
   }
   ```

2. **API Routes:**
   - `POST /api/milestones/[id]/pay` - Customer pays milestone
   - `POST /api/milestones/[id]/complete` - Tradesperson marks complete
   - `POST /api/milestones/[id]/approve` - Customer approves
   - `POST /api/milestones/[id]/release` - Auto-release transfer (cron)

3. **UI:**
   - Milestone schedule in application form
   - Payment buttons per milestone
   - Progress tracking
   - Dispute button per milestone

4. **All linked by `transfer_group`:**
   ```typescript
   transfer_group: `job_${jobId}`
   ```

### Acceptance Criteria

- [ ] Tradespeople can define milestone schedules in applications
- [ ] Customers can pay individual milestones
- [ ] Platform holds funds until milestone approved
- [ ] Transfer released within 24h of approval
- [ ] All payments linked by `transfer_group` for reconciliation
- [ ] Dispute process per milestone

### Timeline

**Dependencies:** SC&T model (Decision 1)  
**Estimated Effort:** 3-5 days  
**Planned Sprint:** Q1 2026

### References

- [Audit Report: Section E](./stripe-connect-audit-report.md#5-milestone-payments)

---

## Decision 7: Refund Policy

**Date:** 2025-10-19  
**Status:** 🟡 Partially Implemented  
**Decision Maker:** Engineering Team + Legal

### Context

How to handle refunds before and after funds transferred to tradesperson?

### Decision

**Time-based refund policy with clear rules.**

**Before Work Starts (Before Transfer):**
- Customer can cancel: Full refund minus processing fee (£5 or 2%, whichever lower)
- Tradesperson can cancel: Full refund to customer

**After Work Starts (After Transfer):**
- Mutual agreement: Partial refund based on work completed
- Customer cancels: Refund per contract (typically 20-50% retained by tradesperson)
- Tradesperson cancels: Full refund of remaining work
- Platform mediates disputes

**Technical Implementation:**

**Scenario A: Refund Before Transfer (SC&T only)**
```typescript
// Full refund possible, no transfer yet
const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: fullAmount, // or partial
    reason: 'requested_by_customer',
});
// No tradesperson impact
```

**Scenario B: Refund After Transfer**
```typescript
// 1. Refund to customer
const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: refundAmount,
});

// 2. Reverse transfer from tradesperson
const reversal = await stripe.transfers.createReversal(
    transferId,
    { amount: reversalAmount }
);
```

### Implementation Status

- ✅ Stripe refund API integrated
- ❌ Transfer reversal not implemented
- ❌ No UI for refund requests
- ❌ No admin refund approval flow

### Timeline

**Phase 1:** Basic refund API (1 day)  
**Phase 2:** Transfer reversal (SC&T migration)  
**Phase 3:** Admin refund UI (2 days)

### References

- [Stripe: Refunds](https://stripe.com/docs/refunds)
- [Stripe: Transfer Reversals](https://stripe.com/docs/connect/transfer-reversals)

---

## Decision 8: Dispute Handling

**Date:** 2025-10-19  
**Status:** ❌ Not Implemented  
**Decision Maker:** Engineering Team + Legal

### Context

How to handle Stripe disputes (chargebacks) and internal disputes?

### Decision

**Freeze transfers on dispute, admin mediation required.**

**Process:**
1. Dispute created (Stripe webhook: `charge.dispute.created`)
2. Freeze all future transfers for that job
3. Notify both parties
4. Admin reviews evidence
5. Resolution:
   - Accept dispute: Refund customer, no tradesperson transfer
   - Fight dispute: Submit evidence to Stripe
   - Partial settlement: Split cost between parties

### Implementation Requirements

1. **Webhook Handler:**
   ```typescript
   case "charge.dispute.created": {
       const dispute = event.data.object;
       await prisma.job.update({
           where: { depositChargeId: dispute.charge },
           data: { disputeId: dispute.id, status: 'DISPUTED' },
       });
       // Block future transfers
       // Notify admin
   }
   ```

2. **Schema:**
   ```prisma
   model Job {
       // ... existing fields
       disputeId    String?
       disputeStatus DisputeStatus?
   }
   
   enum DisputeStatus {
       OPEN
       UNDER_REVIEW
       WON
       LOST
       SETTLED
   }
   ```

3. **Admin UI:**
   - Dispute dashboard
   - Evidence upload
   - Resolution workflow

### Timeline

**Priority:** High (legal risk)  
**Estimated Effort:** 3-5 days  
**Planned Sprint:** Q4 2025

---

## Decision 9: Statement Descriptors

**Date:** 2025-10-19  
**Status:** 🟡 To Be Configured  
**Decision Maker:** Marketing + Engineering

### Decision

**Platform descriptor:** `NEEDATRADESMAN.COM`  
**Connected accounts:** Tradesperson business name (if provided)

### Rationale

- ✅ Clear for customers (recognize the marketplace)
- ✅ Reduces disputes ("What's this charge?")
- ✅ Consistent branding

### Implementation

**Platform Descriptor (set in Stripe Dashboard):**
```
Business Name: Need A Tradesman
Statement Descriptor: NEEDATRADESMAN.COM
```

**Connected Accounts:**
```
Default: "[Tradesperson Name] via NEEDATRADESMAN"
Custom: If tradesperson provides business name
```

### Acceptance Criteria

- [ ] Verify in Stripe Dashboard
- [ ] Test with real card (test mode has different descriptors)
- [ ] Check customer receipts

### References

- [Stripe: Statement Descriptors](https://stripe.com/docs/statement-descriptors)

---

## Decision 10: Webhook Configuration

**Date:** 2025-10-19  
**Status:** ✅ Implemented  
**Decision Maker:** Engineering Team

### Current Configuration

**Endpoint:** `https://needatradesman.com/api/stripe/webhook`  
**Events Subscribed:**
- ✅ `checkout.session.completed`
- ✅ `account.updated`

**Missing Events:**
- ❌ `payment_intent.succeeded`
- ❌ `payment_intent.payment_failed`
- ❌ `charge.refunded`
- ❌ `charge.dispute.created`
- ❌ `charge.dispute.closed`
- ❌ `payout.paid`
- ❌ `payout.failed`
- ❌ `transfer.created`
- ❌ `transfer.reversed`

### Decision

**Add missing webhook events** as features are implemented.

**Priority:**
1. **P0:** `payment_intent.succeeded` (for SC&T)
2. **P1:** `charge.dispute.created` (legal risk)
3. **P1:** `transfer.created`, `transfer.reversed` (for SC&T)
4. **P2:** `charge.refunded` (nice to have, can poll API)
5. **P2:** `payout.paid`, `payout.failed` (tradesperson notifications)

### Implementation

**Webhook Handler Structure:**
```typescript
switch (event.type) {
    case "checkout.session.completed": { ... }
    case "payment_intent.succeeded": { ... }
    case "charge.dispute.created": { ... }
    case "transfer.created": { ... }
    // etc.
}
```

**Idempotency:** ✅ Already implemented (Redis + DB)

### Security

- ✅ Signature verification
- ✅ Rate limiting
- ✅ Idempotency check
- ✅ Logging

### References

- [Stripe: Webhook Events](https://stripe.com/docs/api/events/types)

---

## Template for New Decisions

```markdown
## Decision N: [Title]

**Date:** YYYY-MM-DD  
**Status:** 🟡 Draft / ✅ Approved / ❌ Rejected  
**Decision Maker:** [Team/Person]

### Context
[Why this decision is needed]

### Decision
[What we decided]

### Rationale
[Why we made this decision]

### Implementation
[How to implement, code examples]

### Alternatives Considered
[Other options and why rejected]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

### References
- [Link to docs]
```

---

**Document Maintained By:** Engineering Team  
**Last Updated:** 2025-10-19  
**Version:** 1.0
