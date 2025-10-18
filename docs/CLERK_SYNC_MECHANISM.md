# Clerk to Prisma Sync Mechanism

## Overview

This document describes the comprehensive synchronization mechanism between Clerk (authentication provider) and our Prisma database to ensure data consistency and prevent drift.

## Problem Statement

When using Clerk as an authentication provider with a separate database, potential sync issues can arise:

1. **Webhook Failures**: Network issues or server downtime may cause webhook events to be missed
2. **Race Conditions**: Multiple webhook deliveries could cause duplicate processing
3. **Manual Actions**: Users deleted in Clerk dashboard may not sync to the database
4. **Drift Over Time**: Incremental failures can lead to data inconsistency between systems

## Solution Architecture

Our sync mechanism uses a **three-layer approach** similar to the proven Stripe webhook pattern:

### 1. Real-time Sync (Clerk Webhooks)

**File**: `src/app/api/webhooks/clerk/route.ts`

The webhook endpoint handles real-time user events from Clerk:

- `user.created` - Creates new user in database
- `user.updated` - Updates existing user data
- `user.deleted` - Removes user from database

**Key Features**:
- ✅ Signature verification (Svix)
- ✅ Two-layer idempotency (Redis + Database)
- ✅ Comprehensive logging
- ✅ Graceful error handling

### 2. Idempotency Protection

To prevent duplicate processing of webhook events, we implement **two-layer idempotency**:

#### Layer 1: Redis (Primary - Fast)
- **Speed**: Sub-millisecond lookups
- **TTL**: 24 hours
- **Key format**: `webhook:processed:{clerk_event_id}`
- **Graceful degradation**: Falls back to database if unavailable

#### Layer 2: Database (Fallback - Persistent)
- **Reliability**: Survives Redis restarts
- **Model**: `WebhookEvent` with `source: CLERK`
- **Unique constraint**: Prevents duplicate entries
- **Long-term audit trail**

**Implementation Flow**:
```
1. Receive webhook event
   ↓
2. Verify Svix signature
   ↓
3. Check Redis for event ID
   ├─ Found? → Return already_processed
   └─ Not found? → Continue
   ↓
4. Check Database for event ID
   ├─ Found? → Cache in Redis + Return already_processed
   └─ Not found? → Continue
   ↓
5. Process event (create/update/delete user)
   ↓
6. Mark as processed in Redis (24h TTL)
   ↓
7. Store in database as fallback
   ↓
8. Return success
```

### 3. Drift Detection & Recovery

**File**: `scripts/verify-clerk-sync.ts`

A verification script that checks for drift and can automatically fix issues.

**Features**:
- 📊 Compare all users between Clerk and Prisma
- 🔍 Detect missing users in either system
- ⚠️  Identify email mismatches
- 🔧 Automatic sync with `--fix` flag
- 📝 Detailed reporting

**Usage**:
```bash
# Check for drift (read-only)
pnpm tsx scripts/verify-clerk-sync.ts

# Check and automatically fix drift
pnpm tsx scripts/verify-clerk-sync.ts --fix
```

## Database Schema

### WebhookEvent Model
```prisma
model WebhookEvent {
  id        String         @id // Event ID (Stripe or Clerk)
  source    WebhookSource  @default(STRIPE)
  processed Boolean        @default(true)
  createdAt DateTime       @default(now())

  @@index([id, processed])
  @@map("webhook_events")
}

enum WebhookSource {
  STRIPE
  CLERK
}
```

## Configuration

### Environment Variables

```env
# Required for Clerk webhooks
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_xxxxxxxxxxxxx

# Optional - for Redis-based idempotency (recommended)
REDIS_URL=redis://...
```

### Setting up Clerk Webhooks

1. **Navigate to Clerk Dashboard**:
   - Go to https://dashboard.clerk.com
   - Select your application
   - Navigate to **Webhooks** section

2. **Create Webhook Endpoint**:
   - Click "Add Endpoint"
   - URL: `https://yourdomain.com/api/webhooks/clerk`
   - Events to subscribe:
     - `user.created`
     - `user.updated`
     - `user.deleted`

3. **Copy Webhook Secret**:
   - Copy the signing secret (starts with `whsec_`)
   - Add to `.env.local` as `CLERK_WEBHOOK_SECRET`

4. **Verify Endpoint**:
   - Use Clerk's "Send Example" feature
   - Check your server logs for webhook receipt

## Monitoring & Observability

### Key Log Patterns

#### Successful Processing
```
INFO: Webhook received
  eventType: "user.created"
  eventId: "evt_xxxxx"
```

#### Idempotency Hit (Redis)
```
INFO: Webhook event already processed (Redis check)
  eventId: "evt_xxxxx"
  eventType: "user.created"
```

#### Idempotency Hit (Database)
```
INFO: Webhook event already processed (Database check)
  eventId: "evt_xxxxx"
  eventType: "user.created"
```

#### User Synced
```
INFO: User synced to database
  clerkId: "user_xxxxx"
```

### Recommended Monitoring

1. **Alert on Webhook Failures**:
   - Query: `"Error syncing user to database" AND "clerk-webhook"`
   - Action: Investigate and run sync verification script

2. **Monitor Orphaned Users**:
   - Run `verify-clerk-sync.ts` weekly via cron job
   - Alert if drift detected

3. **Track Idempotency Rate**:
   - High idempotency hits may indicate webhook retry issues
   - Normal: <5% of requests
   - Concerning: >20% of requests

## Operational Procedures

### Weekly Health Check
```bash
# Run sync verification
pnpm tsx scripts/verify-clerk-sync.ts

# Check for any drift
# Review output and alerts
```

### Handling Detected Drift

1. **Investigation**:
   ```bash
   # Run verification script
   pnpm tsx scripts/verify-clerk-sync.ts
   ```

2. **Review Issues**:
   - Check which users are missing
   - Review webhook logs for failures
   - Verify Clerk webhook configuration

3. **Fix Issues**:
   ```bash
   # Auto-fix detected drift
   pnpm tsx scripts/verify-clerk-sync.ts --fix
   ```

4. **Verify Fix**:
   ```bash
   # Re-run verification
   pnpm tsx scripts/verify-clerk-sync.ts
   ```

### Emergency Bulk Sync

If webhooks are down or many users are missing:

1. **Fix webhook configuration** in Clerk Dashboard
2. **Run bulk sync**: `pnpm tsx scripts/verify-clerk-sync.ts --fix`
3. **Verify**: Check that all users are synced
4. **Monitor**: Watch webhook logs for proper operation

## Testing

### Local Testing with Clerk CLI

Unfortunately, Clerk doesn't have a CLI like Stripe. Instead:

1. **Use Clerk Dashboard "Testing" tab**:
   - Create test users
   - Verify webhooks are sent
   - Check server logs

2. **Manual Testing**:
   ```bash
   # Create a user via Clerk
   # Watch server logs:
   tail -f logs/combined.log | grep clerk-webhook
   
   # Verify user in database:
   psql $DATABASE_URL -c "SELECT * FROM users WHERE clerk_id = 'user_xxxxx';"
   ```

3. **Test Idempotency**:
   - Use Clerk Dashboard's "Resend" feature
   - Should see "already processed" log

### Integration Testing

```typescript
// Example test (add to your test suite)
describe('Clerk Webhook', () => {
  it('should create user on user.created event', async () => {
    const payload = {
      type: 'user.created',
      data: {
        id: 'user_test123',
        email_addresses: [{ email_address: 'test@example.com' }],
        first_name: 'Test',
        last_name: 'User'
      }
    }
    
    // Send webhook (with valid signature)
    const response = await fetch('/api/webhooks/clerk', {
      method: 'POST',
      headers: { 'svix-signature': '...' },
      body: JSON.stringify(payload)
    })
    
    expect(response.status).toBe(200)
    
    // Verify user in database
    const user = await prisma.user.findUnique({
      where: { clerkId: 'user_test123' }
    })
    expect(user).toBeTruthy()
  })
})
```

## Comparison with Stripe Webhooks

Our Clerk sync follows the same proven patterns as Stripe webhooks:

| Feature | Stripe Webhooks | Clerk Webhooks | Status |
|---------|----------------|----------------|--------|
| Signature Verification | ✅ | ✅ | Implemented |
| Redis Idempotency | ✅ | ✅ | Implemented |
| Database Idempotency | ✅ | ✅ | Implemented |
| Comprehensive Logging | ✅ | ✅ | Implemented |
| Drift Detection Script | ❌ | ✅ | Implemented |
| Rate Limiting | ✅ | ⏳ | Future Enhancement |

## Security Considerations

1. **Webhook Secret Rotation**:
   - Rotate `CLERK_WEBHOOK_SECRET` quarterly
   - Update in all environments simultaneously
   - Monitor for signature failures after rotation

2. **Endpoint Protection**:
   - Webhooks are public (no auth required)
   - Protected by signature verification
   - Consider IP allowlisting if Clerk provides IP ranges

3. **Data Privacy**:
   - Webhooks contain PII (email, name)
   - Ensure HTTPS is enforced
   - Log events without exposing sensitive data

## Troubleshooting

### Issue: Webhook Not Receiving Events

**Symptoms**: User created in Clerk, not in database

**Solutions**:
1. Check webhook endpoint configuration in Clerk Dashboard
2. Verify `CLERK_WEBHOOK_SECRET` is set correctly
3. Check server logs for errors
4. Test endpoint with Clerk's "Send Example" feature
5. Verify server is publicly accessible (not localhost)

### Issue: Duplicate Users

**Symptoms**: Error "Unique constraint failed on clerkId"

**Solutions**:
1. Check idempotency is working (should prevent this)
2. Review webhook logs for duplicate events
3. Verify Redis is healthy: `scripts/verify-clerk-sync.ts`
4. Database constraint will prevent duplicates (safe)

### Issue: Email Mismatch

**Symptoms**: User email in Clerk doesn't match Prisma

**Solutions**:
1. Run: `pnpm tsx scripts/verify-clerk-sync.ts --fix`
2. Check webhook logs for `user.updated` events
3. Verify webhook is subscribed to `user.updated`

### Issue: Orphaned Users

**Symptoms**: Users in Prisma but not in Clerk

**Solutions**:
1. These are users deleted from Clerk
2. Verify `user.deleted` webhook is configured
3. Consider soft-delete instead of hard-delete
4. Review business requirements for user retention

## Performance Considerations

### Webhook Processing Time

- **Redis Check**: <1ms
- **Database Check**: ~5-10ms
- **User Creation**: ~20-50ms
- **Total**: ~30-60ms average

### Scalability

- Handles thousands of user registrations per hour
- Redis idempotency prevents database overload
- Asynchronous processing (webhooks don't block Clerk)

### Database Impact

- One INSERT per new user
- One SELECT per webhook (idempotency check)
- Minimal impact with proper indexing

## Future Enhancements

### Potential Improvements

1. **Rate Limiting**: Add rate limiting like Stripe webhooks
2. **Webhook Queue**: Process webhooks asynchronously with a queue (Bull, BullMQ)
3. **Soft Delete**: Archive deleted users instead of hard delete
4. **Audit Log**: Detailed change tracking for user updates
5. **Metrics Dashboard**: Real-time sync health dashboard
6. **Alerting**: Integration with Sentry/Datadog for drift alerts

### Automated Drift Detection

```yaml
# Example GitHub Actions workflow
name: Clerk Sync Check
on:
  schedule:
    - cron: '0 2 * * 0' # Weekly on Sunday at 2am
jobs:
  verify-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm tsx scripts/verify-clerk-sync.ts
      - name: Alert on drift
        if: failure()
        run: # Send alert to Slack/PagerDuty
```

## References

- [Clerk Webhooks Documentation](https://clerk.com/docs/integrations/webhooks/overview)
- [Svix Webhook Security](https://docs.svix.com/receiving/verifying-payloads/how)
- [Webhook Idempotency Best Practices](../WEBHOOK_IDEMPOTENCY.md)
- [Stripe Integration Review](../STRIPE_INTEGRATION_REVIEW.md) - Similar patterns

## Support

### Getting Help

1. Check this documentation
2. Review webhook logs in Clerk Dashboard
3. Run `verify-clerk-sync.ts` for drift detection
4. Check application logs for errors
5. Verify Redis connectivity

### Reporting Issues

When reporting sync issues, include:
- Output from `verify-clerk-sync.ts`
- Relevant webhook event IDs from Clerk
- Server logs with `clerk-webhook` context
- Number of affected users
- Timeline of when drift occurred
