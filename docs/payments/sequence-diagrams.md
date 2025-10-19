# Payment Flow Sequence Diagrams

This document contains Mermaid sequence diagrams for all payment flows in the Need A Tradesman marketplace.

---

## 1. Current Deposit Flow (Destination Charges)

**Status:** ✅ Currently Implemented

```mermaid
sequenceDiagram
    participant C as Customer
    participant UI as Frontend
    participant API as Backend API
    participant DB as Database
    participant S as Stripe
    participant T as Tradesperson

    Note over C,T: Deposit Payment - Destination Charges Model
    
    C->>UI: Accept Application (50% deposit)
    UI->>API: POST /api/stripe/checkout-session
    
    API->>DB: Fetch job & tradesperson
    DB-->>API: Job + Application data
    
    API->>DB: Check tradesperson.stripeAccountId
    DB-->>API: stripeAccountId exists
    
    API->>S: accounts.retrieve(stripeAccountId)
    S-->>API: Account status (charges_enabled: true)
    
    Note over API: Calculate deposit & platform fee (10%)
    
    API->>S: checkout.sessions.create({<br/>payment_intent_data: {<br/>  application_fee_amount: fee,<br/>  transfer_data: {<br/>    destination: stripeAccountId<br/>  }<br/>},<br/>metadata: { jobId, tradespersonId }})
    
    S-->>API: Session with URL
    API-->>UI: { url: session.url }
    
    UI->>C: Redirect to Stripe Checkout
    C->>S: Complete payment (card)
    
    Note over S: Platform MoR<br/>Money received by platform
    
    S->>S: Instant transfer to tradesperson<br/>(via transfer_data)
    
    Note over S,T: Tradesperson receives £450<br/>Platform keeps £50 fee
    
    S->>API: Webhook: checkout.session.completed
    
    API->>DB: Check event not processed (idempotency)
    DB-->>API: Event is new
    
    API->>DB: BEGIN TRANSACTION
    API->>DB: Check job.depositPaid = false
    DB-->>API: Deposit not yet paid (race check)
    
    API->>DB: UPDATE job SET<br/>depositPaid=true,<br/>status='IN_PROGRESS',<br/>acceptedTradespersonId=...
    
    API->>DB: UPDATE application SET status='ACCEPTED'
    API->>DB: UPDATE applications SET status='REJECTED'<br/>WHERE jobId=... AND id != accepted
    
    API->>DB: INSERT webhookEvent (dedupe)
    API->>DB: COMMIT TRANSACTION
    
    DB-->>API: Success
    API-->>S: 200 OK
    
    Note over C,T: Deposit complete<br/>Funds instantly with tradesperson
    
    UI->>C: Show success message
    T->>T: Sees payout in Stripe (manual payout schedule)
```

**Key Characteristics:**
- ✅ Instant transfer to tradesperson
- ✅ Application fee collected
- ✅ Webhook idempotency & race condition handling
- ❌ No cooling-off period
- ❌ No transfer_group
- ❌ Cannot conditionally release funds

---

## 2. Recommended Deposit Flow (SC&T)

**Status:** 🟡 Recommended Implementation

```mermaid
sequenceDiagram
    participant C as Customer
    participant UI as Frontend
    participant API as Backend API
    participant DB as Database
    participant S as Stripe
    participant Cron as Auto-Release Job
    participant T as Tradesperson

    Note over C,T: Deposit Payment - SC&T Model (Recommended)
    
    C->>UI: Accept Application (50% deposit)
    UI->>API: POST /api/stripe/checkout-session
    
    API->>DB: Fetch job & tradesperson
    DB-->>API: Job + Application data
    
    API->>S: accounts.retrieve(stripeAccountId)
    S-->>API: Account ready
    
    Note over API: Calculate deposit (£500)<br/>transfer_group: "job_{jobId}"
    
    API->>S: paymentIntents.create({<br/>amount: 50000,<br/>currency: 'gbp',<br/>transfer_group: 'job_xyz',<br/>metadata: { jobId, tradespersonId, type: 'deposit' }<br/>})
    
    S-->>API: PaymentIntent created
    
    API->>S: checkout.sessions.create({<br/>mode: 'payment',<br/>payment_intent: pi.id,<br/>... })
    
    Note over S: NO transfer_data<br/>Funds stay on platform
    
    S-->>API: Session URL
    API-->>UI: { url }
    
    UI->>C: Redirect to Stripe
    C->>S: Complete payment
    
    Note over S: Platform MoR<br/>Funds held by platform<br/>NOT transferred yet
    
    S->>API: Webhook: payment_intent.succeeded
    
    API->>DB: Check idempotency
    DB-->>API: New event
    
    API->>DB: UPDATE job SET<br/>depositPaid=true,<br/>depositPaymentIntentId=...,<br/>depositChargeId=...,<br/>transferGroup='job_xyz',<br/>status='IN_PROGRESS'
    
    API->>DB: UPDATE application status
    API->>DB: INSERT webhookEvent
    DB-->>API: Success
    API-->>S: 200 OK
    
    Note over C,DB: Funds held for 24-48h<br/>Cooling-off period
    
    UI->>C: Payment successful<br/>Funds will be released in 24-48h
    
    rect rgb(200, 220, 250)
        Note over Cron,T: After 24-48h Cooling-off Period
        
        Cron->>DB: Find jobs with:<br/>depositPaid=true<br/>depositReleased=false<br/>createdAt < NOW() - 24h
        
        DB-->>Cron: Jobs ready for release
        
        loop Each eligible job
            Cron->>DB: Check no disputes
            DB-->>Cron: No disputes
            
            Cron->>S: transfers.create({<br/>amount: 45000, (90%)<br/>currency: 'gbp',<br/>destination: stripeAccountId,<br/>transfer_group: 'job_xyz',<br/>metadata: { jobId, type: 'deposit_release' }<br/>})
            
            Note over S: Platform keeps £50 fee (10%)<br/>Transfers £450 to tradesperson
            
            S-->>Cron: Transfer created
            
            Cron->>DB: UPDATE job SET<br/>depositTransferId=...,<br/>depositReleased=true,<br/>depositReleasedAt=NOW()
            
            DB-->>Cron: Success
        end
    end
    
    S->>API: Webhook: transfer.created
    API->>DB: Log transfer (optional)
    
    Note over T: Tradesperson receives £450<br/>Available for payout (manual schedule)
    
    T->>S: Request payout (manual)
    S->>T: Bank transfer
```

**Key Improvements:**
- ✅ 24-48h cooling-off period
- ✅ `transfer_group` links all payments
- ✅ Conditional fund release
- ✅ Can refund before transfer (no tradesperson impact)
- ✅ Better for disputes
- ✅ Supports milestones

---

## 3. Milestone Payment Flow (SC&T)

**Status:** 🔴 Not Implemented (Planned)

```mermaid
sequenceDiagram
    participant C as Customer
    participant UI as UI
    participant API as API
    participant DB as Database
    participant S as Stripe
    participant T as Tradesperson

    Note over C,T: Multi-Milestone Job (£10,000)
    
    rect rgb(255, 240, 240)
        Note over C,T: Milestone 1: Deposit (25% = £2,500)
        
        C->>UI: Pay deposit milestone
        UI->>API: POST /api/milestones/{m1}/pay
        
        API->>S: paymentIntents.create({<br/>amount: 250000,<br/>transfer_group: 'job_xyz',<br/>metadata: { milestoneId: 'm1' }<br/>})
        
        S-->>API: PaymentIntent
        API->>S: checkout.sessions.create(...)
        S-->>API: Session URL
        
        C->>S: Complete payment
        S->>API: Webhook: payment_intent.succeeded
        
        API->>DB: UPDATE milestone SET<br/>status='PAID',<br/>paymentIntentId=...,<br/>paidAt=NOW()
        
        Note over S: Funds held on platform
    end
    
    Note over T: Tradesperson starts work
    
    rect rgb(240, 255, 240)
        Note over C,T: Milestone 2: Plumbing Complete (30% = £3,000)
        
        T->>UI: Mark milestone complete
        UI->>API: POST /api/milestones/{m2}/complete
        
        API->>DB: UPDATE milestone SET<br/>status='AWAITING_APPROVAL',<br/>completedAt=NOW()
        
        DB-->>API: Success
        API-->>UI: Notification to customer
        
        C->>UI: Approve milestone
        UI->>API: POST /api/milestones/{m2}/approve
        
        API->>S: paymentIntents.create({<br/>amount: 300000,<br/>transfer_group: 'job_xyz',<br/>metadata: { milestoneId: 'm2' }<br/>})
        
        C->>S: Pay milestone
        S->>API: Webhook: payment_intent.succeeded
        
        API->>DB: UPDATE milestone SET<br/>status='PAID',<br/>paymentIntentId=...,<br/>paidAt=NOW()
    end
    
    Note over API,T: After 24h (auto-release job)
    
    rect rgb(240, 240, 255)
        Note over API,T: Auto-Release Milestones 1 & 2
        
        API->>DB: Find approved milestones ready for release
        DB-->>API: Milestones m1, m2
        
        loop Each milestone
            API->>S: transfers.create({<br/>amount: milestone.amount * 0.9,<br/>destination: stripeAccountId,<br/>transfer_group: 'job_xyz',<br/>metadata: { milestoneId }<br/>})
            
            S-->>API: Transfer created
            
            API->>DB: UPDATE milestone SET<br/>status='RELEASED',<br/>transferId=...,<br/>releasedAt=NOW()
        end
    end
    
    Note over T: Receives £2,250 + £2,700 = £4,950<br/>(after 10% platform fee)
    
    rect rgb(255, 255, 240)
        Note over C,T: Continue for remaining milestones...
    end
```

**Benefits:**
- ✅ Customer only pays for completed work
- ✅ Tradesperson gets paid progressively
- ✅ All linked by `transfer_group: "job_xyz"`
- ✅ Platform can reconcile entire job
- ✅ Each milestone has approval workflow

---

## 4. Refund Flow (Before Transfer)

**Status:** 🟡 Partial (needs SC&T)

```mermaid
sequenceDiagram
    participant C as Customer
    participant UI as UI
    participant API as API
    participant DB as Database
    participant S as Stripe
    participant T as Tradesperson

    Note over C,T: Refund Before Transfer (SC&T only)
    
    Note over DB: Job has deposit paid<br/>but NOT yet transferred
    
    C->>UI: Request cancellation
    UI->>API: POST /api/jobs/{jobId}/cancel
    
    API->>DB: Fetch job
    DB-->>API: Job with depositPaid=true,<br/>depositReleased=false
    
    API->>API: Check refund policy<br/>(within cooling-off period)
    
    API->>S: refunds.create({<br/>payment_intent: depositPaymentIntentId,<br/>amount: 50000, (full refund)<br/>reason: 'requested_by_customer'<br/>})
    
    S-->>API: Refund created
    Note over S: Money returns to customer<br/>No tradesperson impact
    
    API->>DB: UPDATE job SET<br/>status='CANCELLED',<br/>refundId=...,<br/>refundedAt=NOW()
    
    DB-->>API: Success
    API-->>UI: Refund successful
    UI->>C: £500 refunded
    
    Note over T: Tradesperson NOT affected<br/>(never received funds)
```

---

## 5. Refund Flow (After Transfer)

**Status:** 🔴 Not Implemented

```mermaid
sequenceDiagram
    participant C as Customer
    participant UI as UI
    participant API as API
    participant DB as Database
    participant S as Stripe
    participant T as Tradesperson

    Note over C,T: Refund After Transfer (Requires Reversal)
    
    Note over DB: Job has deposit paid AND transferred
    
    C->>UI: Request partial refund (£200)
    UI->>API: POST /api/jobs/{jobId}/refund
    
    API->>DB: Fetch job
    DB-->>API: Job with<br/>depositReleased=true,<br/>depositTransferId=xyz
    
    API->>API: Calculate amounts<br/>Customer refund: £200<br/>Transfer reversal: £180 (90%)
    
    rect rgb(255, 200, 200)
        Note over API,S: Step 1: Refund to Customer
        
        API->>S: refunds.create({<br/>payment_intent: depositPaymentIntentId,<br/>amount: 20000,<br/>reason: 'requested_by_customer'<br/>})
        
        S-->>API: Refund created
        Note over C: Customer receives £200
    end
    
    rect rgb(255, 220, 200)
        Note over API,T: Step 2: Reverse Transfer from Tradesperson
        
        API->>S: transfers.createReversal(transferId, {<br/>amount: 18000<br/>})
        
        S-->>API: Reversal created
        Note over T: £180 deducted from balance
    end
    
    API->>DB: UPDATE job SET<br/>refundId=...,<br/>reversalId=...,<br/>refundedAmount=200
    
    DB-->>API: Success
    API-->>UI: Partial refund complete
    
    Note over C,T: Customer: +£200<br/>Platform: -£20 (lost fee)<br/>Tradesperson: -£180
```

---

## 6. Dispute Flow

**Status:** 🔴 Not Implemented

```mermaid
sequenceDiagram
    participant C as Customer Bank
    participant S as Stripe
    participant API as API
    participant DB as Database
    participant Admin as Admin
    participant T as Tradesperson

    Note over C,T: Customer Disputes Charge (Chargeback)
    
    C->>S: Customer disputes £500 charge<br/>(via bank)
    
    S->>API: Webhook: charge.dispute.created
    
    API->>DB: Find job by chargeId
    DB-->>API: Job found
    
    API->>DB: UPDATE job SET<br/>status='DISPUTED',<br/>disputeId=...,<br/>disputeCreatedAt=NOW()
    
    API->>DB: BLOCK future transfers for this job
    
    API->>Admin: Alert: New dispute on job {jobId}
    API->>T: Notify: Payment disputed
    
    Admin->>Admin: Review case<br/>Collect evidence
    
    alt Platform Accepts Dispute
        Admin->>S: Accept dispute
        S->>C: Money returned to customer
        Note over T: If already transferred,<br/>transfer reversed
        
        Admin->>DB: UPDATE job SET<br/>disputeStatus='ACCEPTED',<br/>status='CANCELLED'
        
    else Platform Fights Dispute
        Admin->>S: Submit evidence
        S->>C: Review dispute
        
        alt Customer Wins
            C->>S: Dispute upheld
            S->>API: Webhook: charge.dispute.closed (lost)
            API->>DB: UPDATE disputeStatus='LOST'
            Note over API: Reverse any transfers
            
        else Platform Wins
            S->>API: Webhook: charge.dispute.closed (won)
            API->>DB: UPDATE disputeStatus='WON'
            Note over API: Unfreeze transfers
        end
    end
```

---

## 7. Final Payment Flow (Current)

**Status:** ✅ Implemented (Destination Charges)

```mermaid
sequenceDiagram
    participant C as Customer
    participant UI as UI
    participant API as API
    participant DB as Database
    participant S as Stripe
    participant T as Tradesperson

    Note over C,T: Job Completion & Final Payment
    
    rect rgb(240, 255, 240)
        Note over C,T: Both Parties Confirm Completion
        
        T->>UI: Mark job complete
        UI->>API: POST /api/jobs/{jobId}/complete
        API->>DB: UPDATE job SET<br/>tradespersonConfirmedComplete=true
        
        C->>UI: Confirm job complete
        UI->>API: POST /api/jobs/{jobId}/complete
        API->>DB: UPDATE job SET<br/>customerConfirmedComplete=true
        
        Note over API: Both confirmed
        
        API->>DB: UPDATE job SET status='COMPLETED'
    end
    
    rect rgb(255, 240, 240)
        Note over C,T: Final Payment (Remaining 50%)
        
        C->>UI: Pay final amount
        UI->>API: POST /api/stripe/final-payment
        
        API->>DB: Verify job is COMPLETED
        DB-->>API: Job completed
        
        API->>API: Calculate final amount (£500)
        
        API->>S: checkout.sessions.create({<br/>payment_intent_data: {<br/>  application_fee_amount: 5000,<br/>  transfer_data: {<br/>    destination: stripeAccountId<br/>  }<br/>},<br/>metadata: { applicationType: 'final_payment' }<br/>})
        
        S-->>API: Session URL
        C->>S: Complete payment
        
        Note over S: Instant transfer to tradesperson
        
        S->>API: Webhook: checkout.session.completed
        API->>DB: UPDATE job SET<br/>finalPaid=true,<br/>finalPaymentIntentId=...
        
        Note over T: Receives remaining £450<br/>Total: £900 (£1000 - 10% fee)
    end
```

---

## 8. Complete Job Lifecycle (SC&T - Recommended)

**Status:** 🟡 Future State

```mermaid
sequenceDiagram
    participant C as Customer
    participant UI as UI
    participant API as API
    participant DB as Database
    participant S as Stripe
    participant Cron as Auto-Release
    participant T as Tradesperson

    Note over C,T: Complete Job Lifecycle with SC&T
    
    rect rgb(255, 240, 240)
        Note over C,T: 1. Deposit Payment
        C->>API: Pay deposit (£500)
        API->>S: PaymentIntent (transfer_group: 'job_xyz')
        S-->>API: Success
        Note over S: Platform holds £500
    end
    
    rect rgb(255, 255, 240)
        Note over C,T: 2. Cooling-off Period (24-48h)
        Cron->>DB: Check jobs ready for release
        Cron->>S: Create transfer (£450)
        Cron->>DB: Mark depositReleased=true
        Note over T: Receives deposit
    end
    
    rect rgb(240, 255, 240)
        Note over C,T: 3. Work in Progress
        T->>API: Update progress
        C->>API: View progress
    end
    
    rect rgb(240, 240, 255)
        Note over C,T: 4. Both Confirm Completion
        T->>API: Confirm complete
        C->>API: Confirm complete
        API->>DB: Status = COMPLETED
    end
    
    rect rgb(255, 240, 255)
        Note over C,T: 5. Final Payment
        C->>API: Pay final (£500)
        API->>S: PaymentIntent (same transfer_group)
        S-->>API: Success
        Note over S: Platform holds £500
    end
    
    rect rgb(240, 255, 255)
        Note over C,T: 6. Final Payment Release (24h)
        Cron->>S: Create transfer (£450)
        Cron->>DB: Mark finalReleased=true
        Note over T: Receives final payment<br/>Total: £900
    end
    
    Note over S: Reconciliation:<br/>Query by transfer_group='job_xyz'<br/>All payments linked
```

---

## Summary Comparison

| Feature | Current (Destination) | Recommended (SC&T) |
|---------|----------------------|-------------------|
| **Payout Timing** | Instant | Controlled (24-48h) |
| **Cooling-off** | ❌ No | ✅ Yes |
| **Milestones** | ⚠️ Limited | ✅ Full support |
| **transfer_group** | ❌ No | ✅ Yes |
| **Refund (before)** | ⚠️ Affects tradesperson | ✅ No tradesperson impact |
| **Reconciliation** | ⚠️ Manual | ✅ Automatic via group |
| **Flexibility** | Low | High |
| **Complexity** | Low | Medium |

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-19  
**Maintained By:** Engineering Team
