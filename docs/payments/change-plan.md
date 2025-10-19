# Stripe Connect Migration: Change Plan

**Goal:** Migrate from Destination Charges to Separate Charges & Transfers (SC&T) model with minimal risk and downtime.

**Status:** 🟡 Planning Phase  
**Estimated Total Effort:** 2-3 weeks  
**Risk Level:** Medium  
**Rollback Complexity:** Low (feature flag)

---

## Migration Strategy

### Approach: Incremental Migration with Feature Flag

**Why this approach:**
- ✅ No downtime required
- ✅ Can test in production with small % of traffic
- ✅ Easy rollback if issues found
- ✅ Learn from real usage before full migration
- ✅ Backward compatible

**Phases:**
1. **Phase 0:** Quick fixes to current system (1 day)
2. **Phase 1:** Implement SC&T alongside current (5 days)
3. **Phase 2:** Gradual rollout (1 week, monitoring)
4. **Phase 3:** Full migration & cleanup (3 days)

---

## Phase 0: Critical Quick Fixes (P0)

**Duration:** 1 day  
**Risk:** Low  
**Can Deploy Independently:** Yes

### Fix 1: Add transfer_group to Current Implementation

**Problem:** No reconciliation linkage between payments

**Change:**
```typescript
// src/app/api/stripe/checkout-session/route.ts:139-150
payment_intent_data: {
    application_fee_amount: platformFee,
    transfer_group: `job_${jobId}`, // ADD THIS
    transfer_data: {
        destination: tradesperson.stripeAccountId,
    },
    metadata: { // ADD THIS to ensure PI inherits
        jobId: job.id,
        tradespersonId: tradespersonId,
        applicationType: "deposit",
        applicationId: application.id,
    },
},
```

**Testing:**
```bash
# Create test payment
# Verify in Stripe Dashboard: PaymentIntent has transfer_group
# Verify: Transfer has matching transfer_group
```

---

### Fix 2: Add Schema Fields for Better Tracking

**Migration:**
```sql
-- prisma/schema.prisma additions
model Job {
  // ... existing fields
  transferGroup          String?
  depositChargeId        String?
  depositTransferId      String?
  depositReleasedAt      DateTime?
  finalChargeId          String?
  finalTransferId        String?
  finalReleasedAt        DateTime?
  chargeModel            ChargeModel? // Track which model used
}

enum ChargeModel {
  DESTINATION_CHARGE  // Current (instant transfer)
  SC_AND_T           // Separate Charges & Transfers (controlled)
}
```

**Apply Migration:**
```bash
pnpm prisma migrate dev --name add_payment_tracking_fields
pnpm prisma generate
```

**Update Code:**
```typescript
// Save charge model when creating checkout
await prisma.job.update({
    where: { id: jobId },
    data: {
        transferGroup: `job_${jobId}`,
        chargeModel: 'DESTINATION_CHARGE', // or 'SC_AND_T'
    },
});
```

---

### Fix 3: Remove Broken Payout Logic

**Problem:** `initiatePayoutToTradesperson` in complete/route.ts is incorrect

**Change:**
```typescript
// src/app/api/jobs/[jobId]/complete/route.ts:95-111

// DELETE this entire section:
if (jobWithCompletionFields.depositPaid && acceptedApplication?.tradesperson.stripeAccountId) {
    try {
        await initiatePayoutToTradesperson(updatedJob, acceptedApplication);
    } catch (payoutError) {
        logger.error({ error: payoutError }, "Payout initiation failed");
    }
}

// DELETE the entire initiatePayoutToTradesperson function (lines 129-193)

// REPLACE with simple logging:
if (bothConfirmed) {
    await prisma.job.update({
        where: { id: jobId },
        data: { status: "COMPLETED" }
    });
    
    logger.info({ jobId }, "Job completed - funds already transferred via Destination Charges");
}
```

**Rationale:**
- Current: Funds already transferred via Destination Charges
- This code would fail or double-transfer
- SC&T will handle this properly in Phase 1

---

### Fix 4: Update Webhook Metadata Matching

**Problem:** Metadata key mismatch between session and webhook

**Change:**
```typescript
// Ensure consistent metadata keys
// src/app/api/stripe/checkout-session/route.ts:145-150
metadata: {
    jobId: job.id,
    tradespersonId: tradespersonId,
    applicationType: "deposit", // Consistent key
    applicationId: application.id,
    platformFee: platformFee.toString(),
}

// src/app/api/stripe/final-payment/route.ts:156-163
metadata: {
    jobId: job.id,
    applicationId: application.id,
    tradespersonId: application.tradespersonId,
    applicationType: "final_payment", // Match webhook check
    depositAmount: depositAmount.toString(),
    finalAmount: remainingAmount.toString(),
    platformFee: platformFee.toString(),
}
```

---

## Phase 1: Implement SC&T Model (P0)

**Duration:** 5 days  
**Risk:** Medium  
**Feature Flag:** `FEATURE_SC_AND_T`

### Day 1: Foundation & Infrastructure

#### Task 1.1: Environment Configuration

**Add to .env.example:**
```bash
# Feature Flags
FEATURE_SC_AND_T=false # Enable Separate Charges & Transfers model
SC_AND_T_ROLLOUT_PERCENTAGE=0 # 0-100, gradual rollout
```

**Add to lib/feature-flags.ts:**
```typescript
export const FEATURES = {
  SC_AND_T: process.env.FEATURE_SC_AND_T === 'true',
  SC_AND_T_ROLLOUT: parseInt(process.env.SC_AND_T_ROLLOUT_PERCENTAGE || '0', 10),
} as const;

export function shouldUseSCAndT(userId?: string): boolean {
  if (!FEATURES.SC_AND_T) return false;
  
  // Gradual rollout based on user ID hash
  if (FEATURES.SC_AND_T_ROLLOUT === 100) return true;
  if (FEATURES.SC_AND_T_ROLLOUT === 0) return false;
  
  if (!userId) return false;
  const hash = simpleHash(userId);
  return (hash % 100) < FEATURES.SC_AND_T_ROLLOUT;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}
```

#### Task 1.2: Update Schema for SC&T

**Additional fields:**
```prisma
model Job {
  // ... existing fields
  
  // SC&T specific fields
  depositHeldUntil       DateTime? // When to auto-release
  depositReleased        Boolean   @default(false)
  finalHeldUntil         DateTime?
  finalReleased          Boolean   @default(false)
}
```

**Run migration:**
```bash
pnpm prisma migrate dev --name add_sc_and_t_fields
```

---

### Day 2: SC&T Payment Collection

#### Task 2.1: Create Enhanced Payment Route

**New file:** `src/app/api/stripe/payment-intent/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { shouldUseSCAndT } from "@/lib/feature-flags";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-payment-intent");

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, amount, type, tradespersonId, applicationId } = await request.json();

    if (!jobId || !amount || !type) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        // Fetch job
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: { customer: true }
        });

        if (!job || job.customer.clerkId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check if should use SC&T
        const useSCAndT = shouldUseSCAndT(userId);

        if (!useSCAndT) {
            // Fall back to existing checkout-session route
            return NextResponse.json({ 
                useLegacy: true,
                message: "Use /api/stripe/checkout-session" 
            });
        }

        // SC&T: Create PaymentIntent WITHOUT transfer_data
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100),
            currency: 'gbp',
            transfer_group: `job_${jobId}`,
            metadata: {
                jobId,
                tradespersonId: tradespersonId || '',
                applicationId: applicationId || '',
                applicationType: type,
                chargeModel: 'SC_AND_T',
            },
            // NO transfer_data - we'll transfer later
        });

        // Create Checkout Session
        const origin = request.headers.get("origin") || "http://localhost:3000";
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            payment_intent: paymentIntent.id,
            success_url: `${origin}/dashboard/jobs/${jobId}?payment_success=true`,
            cancel_url: `${origin}/dashboard/jobs/${jobId}?payment_cancelled=true`,
        });

        // Update job with SC&T tracking
        const holdUntil = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h
        await prisma.job.update({
            where: { id: jobId },
            data: {
                transferGroup: `job_${jobId}`,
                chargeModel: 'SC_AND_T',
                ...(type === 'deposit' && {
                    depositHeldUntil: holdUntil,
                }),
                ...(type === 'final_payment' && {
                    finalHeldUntil: holdUntil,
                }),
            },
        });

        logger.info({ 
            jobId, 
            paymentIntentId: paymentIntent.id,
            chargeModel: 'SC_AND_T' 
        }, "SC&T payment intent created");

        return NextResponse.json({ 
            url: session.url,
            paymentIntentId: paymentIntent.id,
            chargeModel: 'SC_AND_T',
        });

    } catch (error) {
        logger.error({ error }, "Error creating SC&T payment");
        return NextResponse.json({ error: "Payment creation failed" }, { status: 500 });
    }
}
```

#### Task 2.2: Update Checkout Session Route to Support Both Models

**Modify:** `src/app/api/stripe/checkout-session/route.ts`

```typescript
// At the start of POST handler:
const useSCAndT = shouldUseSCAndT(userId);

if (useSCAndT) {
    // Redirect to new SC&T route
    return NextResponse.json({
        message: "Use /api/stripe/payment-intent for SC&T",
        redirect: "/api/stripe/payment-intent"
    }, { status: 307 });
}

// ... rest of existing Destination Charges logic
```

---

### Day 3: SC&T Webhook Handlers

#### Task 3.1: Add payment_intent.succeeded Handler

**Modify:** `src/app/api/stripe/webhook/route.ts`

```typescript
// Add new case after checkout.session.completed

case "payment_intent.succeeded": {
    const pi = event.data.object as Stripe.PaymentIntent;
    
    // Only handle SC&T payments (check metadata)
    if (pi.metadata?.chargeModel !== 'SC_AND_T') {
        logger.debug("Skipping non-SC&T payment intent");
        break;
    }

    const { jobId, applicationType, applicationId, tradespersonId } = pi.metadata;

    if (!jobId) {
        logger.error("Missing jobId in payment_intent metadata");
        break;
    }

    try {
        if (applicationType === "deposit") {
            await prisma.$transaction(async (tx) => {
                // Check if already processed
                const currentJob = await tx.job.findUnique({
                    where: { id: jobId },
                    select: { depositPaid: true }
                });

                if (currentJob?.depositPaid) {
                    logger.warn("Deposit already marked paid - idempotency check");
                    return;
                }

                // Update job
                await tx.job.update({
                    where: { id: jobId },
                    data: {
                        depositPaid: true,
                        depositPaymentIntentId: pi.id,
                        depositChargeId: pi.latest_charge as string,
                        status: "IN_PROGRESS",
                        acceptedTradespersonId: tradespersonId,
                    },
                });

                // Update application
                if (applicationId) {
                    await tx.application.update({
                        where: { id: applicationId },
                        data: { status: "ACCEPTED" },
                    });

                    // Reject others
                    await tx.application.updateMany({
                        where: {
                            jobId: jobId,
                            id: { not: applicationId },
                        },
                        data: { status: "REJECTED" },
                    });
                }
            });

            logger.info({ jobId, piId: pi.id }, "SC&T deposit payment captured");
        }

        if (applicationType === "final_payment") {
            await prisma.$transaction(async (tx) => {
                const currentJob = await tx.job.findUnique({
                    where: { id: jobId },
                    select: { finalPaid: true }
                });

                if (currentJob?.finalPaid) {
                    logger.warn("Final payment already marked paid");
                    return;
                }

                await tx.job.update({
                    where: { id: jobId },
                    data: {
                        finalPaid: true,
                        finalPaymentIntentId: pi.id,
                        finalChargeId: pi.latest_charge as string,
                    },
                });
            });

            logger.info({ jobId, piId: pi.id }, "SC&T final payment captured");
        }

    } catch (error) {
        logger.error({ error, jobId }, "Failed to process payment_intent.succeeded");
    }

    break;
}
```

---

### Day 4: SC&T Transfer Release System

#### Task 4.1: Create Transfer Release API

**New file:** `src/app/api/stripe/release-payment/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger("stripe-release-payment");

export async function POST(request: NextRequest) {
    const { userId } = await auth();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { jobId, type } = await request.json(); // type: 'deposit' | 'final'

    if (!jobId || !type) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    try {
        // Fetch job with tradesperson
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                applications: {
                    where: { status: "ACCEPTED" },
                    include: { tradesperson: true },
                    take: 1,
                },
            },
        });

        if (!job) {
            return NextResponse.json({ error: "Job not found" }, { status: 404 });
        }

        // Admin check or auto-release system
        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        const isAdmin = user?.role === 'ADMIN'; // Assuming admin role exists
        
        if (!isAdmin) {
            return NextResponse.json({ error: "Only admin can manually release" }, { status: 403 });
        }

        const acceptedApplication = job.applications[0];
        if (!acceptedApplication?.tradesperson.stripeAccountId) {
            return NextResponse.json({ error: "No tradesperson account" }, { status: 400 });
        }

        if (type === 'deposit') {
            // Check if already released
            if (job.depositReleased) {
                return NextResponse.json({ error: "Deposit already released" }, { status: 400 });
            }

            if (!job.depositPaid || !job.depositPaymentIntentId) {
                return NextResponse.json({ error: "Deposit not paid" }, { status: 400 });
            }

            // Fetch payment intent to get amount
            const pi = await stripe.paymentIntents.retrieve(job.depositPaymentIntentId);
            const platformFee = calculatePlatformFee(pi.amount / 100);
            const transferAmount = pi.amount - platformFee;

            // Create transfer
            const transfer = await stripe.transfers.create({
                amount: transferAmount,
                currency: 'gbp',
                destination: acceptedApplication.tradesperson.stripeAccountId,
                transfer_group: job.transferGroup || `job_${jobId}`,
                metadata: {
                    jobId,
                    tradespersonId: acceptedApplication.tradespersonId,
                    applicationType: 'deposit_release',
                },
            });

            // Update job
            await prisma.job.update({
                where: { id: jobId },
                data: {
                    depositTransferId: transfer.id,
                    depositReleased: true,
                    depositReleasedAt: new Date(),
                },
            });

            logger.info({ jobId, transferId: transfer.id }, "Deposit released");

            return NextResponse.json({
                success: true,
                transferId: transfer.id,
                amount: transferAmount / 100,
            });
        }

        if (type === 'final') {
            // Similar logic for final payment
            if (job.finalReleased) {
                return NextResponse.json({ error: "Final payment already released" }, { status: 400 });
            }

            if (!job.finalPaid || !job.finalPaymentIntentId) {
                return NextResponse.json({ error: "Final payment not paid" }, { status: 400 });
            }

            const pi = await stripe.paymentIntents.retrieve(job.finalPaymentIntentId);
            const platformFee = calculatePlatformFee(pi.amount / 100);
            const transferAmount = pi.amount - platformFee;

            const transfer = await stripe.transfers.create({
                amount: transferAmount,
                currency: 'gbp',
                destination: acceptedApplication.tradesperson.stripeAccountId,
                transfer_group: job.transferGroup || `job_${jobId}`,
                metadata: {
                    jobId,
                    tradespersonId: acceptedApplication.tradespersonId,
                    applicationType: 'final_release',
                },
            });

            await prisma.job.update({
                where: { id: jobId },
                data: {
                    finalTransferId: transfer.id,
                    finalReleased: true,
                    finalReleasedAt: new Date(),
                },
            });

            logger.info({ jobId, transferId: transfer.id }, "Final payment released");

            return NextResponse.json({
                success: true,
                transferId: transfer.id,
                amount: transferAmount / 100,
            });
        }

        return NextResponse.json({ error: "Invalid type" }, { status: 400 });

    } catch (error) {
        logger.error({ error }, "Error releasing payment");
        return NextResponse.json({ error: "Release failed" }, { status: 500 });
    }
}
```

#### Task 4.2: Create Auto-Release Cron Job

**New file:** `src/app/api/cron/auto-release-payments/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, calculatePlatformFee } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger("cron-auto-release");

// This should be called by Vercel Cron or similar
// Add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/auto-release-payments",
//     "schedule": "0 * * * *"  // Every hour
//   }]
// }

export async function GET(request: NextRequest) {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const now = new Date();

        // Find deposits ready for release
        const depositsToRelease = await prisma.job.findMany({
            where: {
                chargeModel: 'SC_AND_T',
                depositPaid: true,
                depositReleased: false,
                depositHeldUntil: { lte: now },
                status: { not: 'CANCELLED' },
            },
            include: {
                applications: {
                    where: { status: 'ACCEPTED' },
                    include: { tradesperson: true },
                    take: 1,
                },
            },
            take: 50, // Process in batches
        });

        const results = {
            depositsProcessed: 0,
            finalsProcessed: 0,
            errors: [] as string[],
        };

        // Process deposits
        for (const job of depositsToRelease) {
            try {
                const app = job.applications[0];
                if (!app?.tradesperson.stripeAccountId || !job.depositPaymentIntentId) {
                    continue;
                }

                const pi = await stripe.paymentIntents.retrieve(job.depositPaymentIntentId);
                const platformFee = calculatePlatformFee(pi.amount / 100);
                const transferAmount = pi.amount - platformFee;

                const transfer = await stripe.transfers.create({
                    amount: transferAmount,
                    currency: 'gbp',
                    destination: app.tradesperson.stripeAccountId,
                    transfer_group: job.transferGroup || `job_${job.id}`,
                    metadata: {
                        jobId: job.id,
                        tradespersonId: app.tradespersonId,
                        applicationType: 'deposit_release_auto',
                    },
                });

                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        depositTransferId: transfer.id,
                        depositReleased: true,
                        depositReleasedAt: now,
                    },
                });

                results.depositsProcessed++;
                logger.info({ jobId: job.id, transferId: transfer.id }, "Auto-released deposit");

            } catch (error) {
                logger.error({ error, jobId: job.id }, "Failed to auto-release deposit");
                results.errors.push(`Job ${job.id}: ${error}`);
            }
        }

        // Similar for final payments
        const finalsToRelease = await prisma.job.findMany({
            where: {
                chargeModel: 'SC_AND_T',
                finalPaid: true,
                finalReleased: false,
                finalHeldUntil: { lte: now },
                status: 'COMPLETED',
            },
            include: {
                applications: {
                    where: { status: 'ACCEPTED' },
                    include: { tradesperson: true },
                    take: 1,
                },
            },
            take: 50,
        });

        for (const job of finalsToRelease) {
            try {
                const app = job.applications[0];
                if (!app?.tradesperson.stripeAccountId || !job.finalPaymentIntentId) {
                    continue;
                }

                const pi = await stripe.paymentIntents.retrieve(job.finalPaymentIntentId);
                const platformFee = calculatePlatformFee(pi.amount / 100);
                const transferAmount = pi.amount - platformFee;

                const transfer = await stripe.transfers.create({
                    amount: transferAmount,
                    currency: 'gbp',
                    destination: app.tradesperson.stripeAccountId,
                    transfer_group: job.transferGroup || `job_${job.id}`,
                    metadata: {
                        jobId: job.id,
                        tradespersonId: app.tradespersonId,
                        applicationType: 'final_release_auto',
                    },
                });

                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        finalTransferId: transfer.id,
                        finalReleased: true,
                        finalReleasedAt: now,
                    },
                });

                results.finalsProcessed++;
                logger.info({ jobId: job.id, transferId: transfer.id }, "Auto-released final");

            } catch (error) {
                logger.error({ error, jobId: job.id }, "Failed to auto-release final");
                results.errors.push(`Job ${job.id}: ${error}`);
            }
        }

        return NextResponse.json({
            success: true,
            ...results,
            timestamp: now.toISOString(),
        });

    } catch (error) {
        logger.error({ error }, "Cron job failed");
        return NextResponse.json({ error: "Cron failed" }, { status: 500 });
    }
}
```

**Add to .env.example:**
```bash
# Cron job authentication
CRON_SECRET=your-random-secret-here
```

---

### Day 5: Testing & Documentation

#### Task 5.1: Comprehensive Testing

**Test Checklist:**
```bash
# 1. Feature flag OFF (current behavior)
FEATURE_SC_AND_T=false pnpm dev
# - Create job, accept application, pay deposit
# - Verify: Destination Charges still work
# - Check Stripe: Instant transfer visible

# 2. Feature flag ON (new behavior)
FEATURE_SC_AND_T=true pnpm dev
# - Create job, accept application, pay deposit
# - Verify: Payment intent created with transfer_group
# - Verify: No instant transfer
# - Check DB: depositHeldUntil set
# - Wait or manually release via API
# - Verify: Transfer created

# 3. Gradual rollout
SC_AND_T_ROLLOUT_PERCENTAGE=10
# - Test with multiple users
# - Verify: ~10% get SC&T, 90% get Destination
```

#### Task 5.2: Update Documentation

**Files to update:**
- [ ] README.md (mention feature flag)
- [ ] docs/payments/*.md (mark SC&T as available)
- [ ] API documentation (new endpoints)

---

## Phase 2: Gradual Rollout (1 week)

**Duration:** 1 week (monitoring period)  
**Risk:** Low  
**Goal:** Validate SC&T in production with real traffic

### Day 1-2: 1% Rollout

```bash
# In production environment
SC_AND_T_ROLLOUT_PERCENTAGE=1
```

**Monitoring:**
- Check logs for SC&T payments
- Verify transfers released correctly
- Monitor Stripe Dashboard for issues
- Check customer/tradesperson complaints

### Day 3-4: 10% Rollout

```bash
SC_AND_T_ROLLOUT_PERCENTAGE=10
```

**Metrics to track:**
- Payment success rate
- Transfer success rate
- Time to release (should be ~48h)
- Customer satisfaction
- Tradesperson satisfaction

### Day 5-7: 50% Rollout

```bash
SC_AND_T_ROLLOUT_PERCENTAGE=50
```

**At this point:**
- If no issues, proceed to 100%
- If issues, rollback to 10% and debug

---

## Phase 3: Full Migration & Cleanup (3 days)

**Duration:** 3 days  
**Risk:** Low  
**Goal:** Complete migration and remove old code

### Day 1: 100% SC&T

```bash
# Enable for all users
FEATURE_SC_AND_T=true
SC_AND_T_ROLLOUT_PERCENTAGE=100
```

**Monitor closely for 24-48h**

### Day 2: Migrate Existing Jobs (Optional)

**Decision:** Should we migrate in-progress jobs?

**Option A:** Leave old jobs as-is (Destination Charges)
- ✅ Simpler, less risk
- ✅ Old jobs complete naturally
- ⚠️ Two code paths temporarily

**Option B:** Migrate old jobs to SC&T
- ⚠️ Complex, higher risk
- ❌ Need to reconcile existing transfers
- ❌ Not recommended

**Recommendation:** Option A

### Day 3: Code Cleanup

**Remove:**
- Feature flag checks (make SC&T default)
- Old Destination Charge code paths
- Legacy checkout-session logic

**Keep:**
- Destination Charge webhook handling (for old jobs)
- Can remove after all old jobs complete

---

## Rollback Plan

### Scenario: SC&T Causes Critical Issues

**Indicators:**
- Payment success rate drops >5%
- Transfer failures spike
- Customer complaints increase
- Stripe errors

**Rollback Steps:**

1. **Immediate (< 5 minutes):**
   ```bash
   # Disable feature flag
   FEATURE_SC_AND_T=false
   SC_AND_T_ROLLOUT_PERCENTAGE=0
   ```

2. **Short-term (same day):**
   - Investigate root cause
   - Check Stripe logs
   - Review error logs
   - Identify failed jobs

3. **Recovery (1-2 days):**
   - Manually release stuck transfers
   - Refund affected customers if needed
   - Fix issues
   - Re-test in staging

**Data Impact:**
- Jobs created with SC&T will have pending transfers
- No data loss, just incomplete transfers
- Manual intervention to complete or refund

**Communication:**
- Notify affected customers
- Notify tradespeople about delays
- Provide ETA for resolution

---

## Risk Mitigation

### Risk 1: Transfers Not Released

**Mitigation:**
- Cron job runs every hour (failsafe)
- Manual release API for admin
- Alerts if transfers >72h old

### Risk 2: Feature Flag Fails

**Mitigation:**
- Graceful fallback to Destination Charges
- Feature flag service monitoring
- Manual override capability

### Risk 3: Stripe API Issues

**Mitigation:**
- Retry logic with exponential backoff
- Queue failed transfers for retry
- Admin dashboard to see pending releases

### Risk 4: User Confusion

**Mitigation:**
- Clear messaging: "Payment held for 24-48h"
- Email notifications to tradespeople
- FAQ updates
- Support team training

---

## Success Criteria

### Phase 0:
- [x] transfer_group added to all new payments
- [x] Schema updated with tracking fields
- [x] Broken payout logic removed
- [x] All tests pass

### Phase 1:
- [ ] SC&T payment flow works end-to-end
- [ ] Transfers released correctly after 48h
- [ ] Feature flag controls behavior
- [ ] No regression in Destination Charges

### Phase 2:
- [ ] 1% rollout completes without issues
- [ ] 10% rollout shows stable metrics
- [ ] 50% rollout maintains quality
- [ ] Customer satisfaction unchanged

### Phase 3:
- [ ] 100% SC&T with no Destination Charges
- [ ] Code cleanup complete
- [ ] Documentation updated
- [ ] Team trained on new flow

---

## Post-Migration Tasks

1. **Monitoring Dashboard:**
   - Transfers pending release
   - Average time to release
   - Success/failure rates

2. **Admin Tools:**
   - View pending transfers
   - Manual release button
   - Refund management

3. **Milestone Payments (Phase 4):**
   - Now possible with SC&T foundation
   - Estimated: 3-5 days additional work

4. **Bank Transfer (Phase 5):**
   - Enable in Stripe
   - Integration work

5. **BNPL (Phase 6):**
   - Apply for Klarna/Clearpay
   - Integration work

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-19  
**Owner:** Engineering Team
