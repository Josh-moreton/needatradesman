# Race Condition Fix - Testing Guide

## Overview
This document provides guidance on how to verify that the race condition fixes are working correctly.

## What Was Fixed

### Issues Addressed
1. **Deposit Payment Race Condition**: Two tradespeople could both be accepted for the same job
2. **Final Payment Race Condition**: Final payment could be processed multiple times
3. **Database Inconsistency**: Partial updates could leave data in inconsistent state
4. **Duplicate Payment Processing**: Same payment intent could be processed twice

### Solution Implemented
1. **Application-Level Protection**: Prisma transactions with duplicate checks
2. **Database-Level Protection**: Unique constraints on payment intent IDs
3. **Enhanced Logging**: Structured logging for debugging and monitoring

## Test Scenarios

### Scenario 1: Normal Deposit Payment Flow
**Expected Behavior**: Payment processed successfully

**Steps**:
1. Customer posts a job
2. Tradesperson submits application with quote
3. Customer accepts the application
4. Stripe checkout session completes
5. Webhook processes deposit payment

**Verify**:
- Job status changes to `IN_PROGRESS`
- `depositPaid` flag is `true`
- `depositPaymentIntentId` is set
- `acceptedTradespersonId` is set
- Application status is `ACCEPTED`
- Other applications are `REJECTED`
- Log shows: `[SUCCESS] Deposit payment processed for job {jobId}, tradesperson {tradespersonId}, session {sessionId}`

### Scenario 2: Duplicate Deposit Payment Attempt (Application Level)
**Expected Behavior**: Second attempt is blocked by transaction check

**Simulated Steps**:
1. Complete a successful deposit payment (Scenario 1)
2. Simulate Stripe sending the same webhook again
3. Or send a duplicate webhook manually

**Verify**:
- Second attempt fails with transaction error
- Job remains in `IN_PROGRESS` with original payment
- No database changes occur
- Log shows: `[RACE CONDITION BLOCKED] Job {jobId} already has deposit paid. Attempted by tradesperson {tradespersonId}, session {sessionId}`
- Webhook returns 200 (to prevent Stripe retries)

### Scenario 3: Concurrent Deposit Payment Attempts (Database Level)
**Expected Behavior**: Database constraint prevents duplicate payment intents

**Simulated Steps**:
1. Two concurrent webhook calls with same payment intent ID
2. Both attempt to update the same job

**Verify**:
- Only one succeeds
- Second fails with unique constraint violation
- Database remains consistent
- Transaction rollback occurs for failed attempt
- Log shows appropriate error message

### Scenario 4: Normal Final Payment Flow
**Expected Behavior**: Final payment processed successfully

**Steps**:
1. Complete deposit payment (Scenario 1)
2. Tradesperson marks job as complete
3. Customer confirms completion
4. Customer pays final amount
5. Stripe checkout session completes
6. Webhook processes final payment

**Verify**:
- `finalPaid` flag is `true`
- `finalPaymentIntentId` is set
- Job can proceed to payout release
- Log shows: `[SUCCESS] Final payment processed for job {jobId}, session {sessionId}`

### Scenario 5: Duplicate Final Payment Attempt
**Expected Behavior**: Second attempt is blocked

**Simulated Steps**:
1. Complete a successful final payment (Scenario 4)
2. Simulate Stripe sending the same webhook again

**Verify**:
- Second attempt fails with transaction error
- Job final payment details remain unchanged
- No database changes occur
- Log shows: `[RACE CONDITION BLOCKED] Job {jobId} already has final payment paid. Session {sessionId}`

## Manual Testing with Stripe CLI

### Setup
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Test Duplicate Webhook
```bash
# Trigger a webhook event
stripe trigger checkout.session.completed

# Get the event ID from the output, then replay it
stripe events resend evt_xxxxx
```

### Test Concurrent Webhooks
```bash
# Send the same event multiple times in quick succession
for i in {1..5}; do
  stripe events resend evt_xxxxx &
done
wait
```

## Monitoring in Production

### Key Metrics to Monitor

1. **Race Condition Blocks**
   - Search logs for: `[RACE CONDITION BLOCKED]`
   - Should be rare after fix
   - If frequent, investigate why duplicate webhooks are occurring

2. **Transaction Failures**
   - Search logs for: `[ERROR] Transaction failed`
   - Distinguish between race condition errors and other errors
   - Race condition errors are expected behavior
   - Other errors may require investigation

3. **Successful Payments**
   - Search logs for: `[SUCCESS] Deposit payment processed`
   - Search logs for: `[SUCCESS] Final payment processed`
   - Should match Stripe dashboard payment counts

4. **Database Constraint Violations**
   - Monitor database logs for unique constraint violations
   - Should correlate with race condition block logs
   - Indicates database-level protection is working

### Log Queries

**Find all race condition blocks:**
```
[RACE CONDITION BLOCKED]
```

**Find all transaction errors:**
```
[ERROR] Transaction failed
```

**Find successful payments:**
```
[SUCCESS] Deposit payment processed OR [SUCCESS] Final payment processed
```

## Database Verification Queries

### Check for Duplicate Payment Intents (Should return 0 rows)
```sql
-- Check deposit payment intents
SELECT "depositPaymentIntentId", COUNT(*) as count
FROM jobs 
WHERE "depositPaymentIntentId" IS NOT NULL 
GROUP BY "depositPaymentIntentId" 
HAVING COUNT(*) > 1;

-- Check final payment intents
SELECT "finalPaymentIntentId", COUNT(*) as count
FROM jobs 
WHERE "finalPaymentIntentId" IS NOT NULL 
GROUP BY "finalPaymentIntentId" 
HAVING COUNT(*) > 1;
```

### Check Payment Status Consistency
```sql
-- Jobs with payment intent but not marked as paid
SELECT id, "depositPaymentIntentId", "depositPaid"
FROM jobs 
WHERE "depositPaymentIntentId" IS NOT NULL 
  AND "depositPaid" = false;

SELECT id, "finalPaymentIntentId", "finalPaid"
FROM jobs 
WHERE "finalPaymentIntentId" IS NOT NULL 
  AND "finalPaid" = false;
```

### Check Application Status Consistency
```sql
-- Jobs with accepted tradesperson should have exactly one ACCEPTED application
SELECT 
  j.id as job_id,
  j."acceptedTradespersonId",
  COUNT(a.id) FILTER (WHERE a.status = 'ACCEPTED') as accepted_count,
  COUNT(a.id) as total_applications
FROM jobs j
LEFT JOIN applications a ON a."jobId" = j.id
WHERE j."acceptedTradespersonId" IS NOT NULL
GROUP BY j.id, j."acceptedTradespersonId"
HAVING COUNT(a.id) FILTER (WHERE a.status = 'ACCEPTED') != 1;
```

## Success Criteria

✅ **Application-Level Protection**
- Transaction blocks duplicate deposit payments
- Transaction blocks duplicate final payments
- All database updates are atomic
- Proper error handling and logging

✅ **Database-Level Protection**
- Unique constraints prevent duplicate payment intents
- Constraint violations are logged
- Database remains consistent

✅ **Observability**
- Clear, structured log messages
- Easy to identify race condition attempts
- Easy to distinguish from other errors
- Sufficient context for debugging

✅ **Data Integrity**
- No duplicate payments in database
- Payment flags consistent with payment intents
- Application statuses consistent with job status
- No orphaned or inconsistent records

## Rollback Plan

If issues are discovered:

1. **Revert Code Changes**
   ```bash
   git revert <commit-hash>
   ```

2. **Rollback Database Migration** (if applied)
   ```bash
   pnpm prisma migrate resolve --rolled-back <migration_name>
   ```

3. **Verify System State**
   - Check recent payments still valid
   - Verify no payments were lost
   - Check application statuses

## Support

If you encounter issues or have questions:
1. Check the logs for `[RACE CONDITION BLOCKED]` or `[ERROR]` messages
2. Run the database verification queries
3. Review the Stripe dashboard for payment status
4. Check this testing guide for expected behavior
