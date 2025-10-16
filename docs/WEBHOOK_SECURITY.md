# Webhook Security and Monitoring

This document describes the security measures and monitoring implemented for the Stripe webhook endpoint.

## Overview

The Stripe webhook endpoint (`/api/stripe/webhook`) processes payment events and is a critical security point. We've implemented multiple layers of protection against attacks and abuse.

## Security Measures

### 1. Signature Verification

All webhook requests must include a valid Stripe signature. This ensures that requests come from Stripe and haven't been tampered with.

**Implementation**: Using Stripe's `stripe.webhooks.constructEvent()` with the webhook secret.

**Failure Response**: HTTP 400 with tracked failure count

### 2. Rate Limiting

Rate limiting prevents DoS attacks and excessive webhook requests.

**Configuration**:
- **Limit**: 100 requests per minute per IP
- **Implementation**: Upstash Redis with sliding window algorithm
- **Response on Exceeded**: HTTP 429 with `Retry-After` header

**Headers Returned**:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds until client can retry

### 3. Failure Tracking

Signature verification failures are tracked in Redis to detect potential attacks.

**Configuration**:
- **Threshold**: 10 failed attempts
- **Time Window**: 5 minutes (300 seconds)
- **Storage**: Redis with automatic expiration

**Tracking Key**: `webhook:failures:{ip_address}`

### 4. Security Alerts

When the failure threshold is exceeded, a security alert is logged with the 🚨 marker for easy detection.

**Alert Conditions**:
- More than 10 signature verification failures from same IP within 5 minutes

**Alert Format**:
```json
{
  "context": "stripe-webhook",
  "level": "error",
  "msg": "🚨 SECURITY ALERT: Multiple webhook signature verification failures - possible attack",
  "ip": "1.2.3.4",
  "failureCount": 11,
  "error": "..."
}
```

## Monitoring

### Log Patterns to Monitor

1. **Security Alerts** (Critical)
   ```
   🚨 SECURITY ALERT: Multiple webhook signature verification failures
   ```
   - Action: Investigate IP address, consider blocking if malicious
   - Expected: Should be rare or never in normal operation

2. **Rate Limit Exceeded** (Warning)
   ```
   Webhook rate limit exceeded
   ```
   - Action: Check if legitimate Stripe traffic spike or potential attack
   - Expected: Rare, may occur during high transaction volume

3. **Signature Verification Failed** (Error)
   ```
   Webhook signature verification failed
   ```
   - Action: Check for webhook secret misconfiguration or Stripe API issues
   - Expected: Occasional, but should not be frequent

4. **Rate Limiter Error** (Error)
   ```
   Webhook rate limiter error (likely Redis connection issue)
   ```
   - Action: Check Redis connectivity and health
   - Expected: Only during Redis outages

### Metrics to Track

1. **Webhook Request Rate**
   - Normal: 1-10 per minute (varies by traffic)
   - Concerning: Sustained >50 per minute from single IP

2. **Signature Failure Rate**
   - Normal: <1% of requests
   - Concerning: >5% of requests

3. **Rate Limit Hits**
   - Normal: 0-1 per day
   - Concerning: Multiple per hour

4. **Security Alerts**
   - Normal: 0
   - Concerning: Any occurrence

### Log Queries

**Production Log Aggregation** (Vercel Logs, CloudWatch, Datadog, etc.):

```
# Find all security alerts
"🚨 SECURITY ALERT" AND "stripe-webhook"

# Find rate limit violations
"Webhook rate limit exceeded"

# Find signature failures
"Webhook signature verification failed"

# Find Redis errors
"Webhook rate limiter error"
```

## Integration with Monitoring Services

### Sentry (Recommended)

The code includes a comment marker where Sentry can be integrated:

```typescript
// Note: Consider integrating with monitoring service here
// Example: Sentry.captureException(err, { tags: { security_alert: true, ip: clientIp } });
```

**To integrate Sentry**:

1. Install Sentry SDK:
   ```bash
   pnpm add @sentry/nextjs
   ```

2. Initialize Sentry in your app

3. Add error capture in webhook route:
   ```typescript
   import * as Sentry from '@sentry/nextjs';
   
   // In the signature verification failure handler:
   if (isWebhookFailureThresholdExceeded(failureCount)) {
       Sentry.captureException(err, {
           tags: {
               security_alert: true,
               ip: clientIp,
               failureCount: failureCount
           },
           level: 'error'
       });
   }
   ```

### Other Monitoring Services

Similar patterns can be used for:
- **Datadog**: Use `@datadog/browser-rum` for APM
- **New Relic**: Use `newrelic` package
- **Custom**: Use webhooks to send alerts to Slack, PagerDuty, etc.

## Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Webhook processed successfully |
| 400 | Bad Request | Invalid signature or missing header |
| 429 | Too Many Requests | Rate limit exceeded, retry after specified time |
| 500 | Internal Error | Server error, Stripe will retry automatically |

## Webhook Secret Rotation

To rotate the webhook secret:

1. Generate new secret in Stripe Dashboard
2. Update `STRIPE_WEBHOOK_SECRET` environment variable
3. Update in all environments (staging, production)
4. Monitor logs for signature failures after deployment
5. Deactivate old webhook endpoint in Stripe after verification

**Note**: Stripe supports multiple webhook endpoints. Consider creating a new endpoint during rotation to avoid downtime.

## Testing

### Local Testing with Stripe CLI

```bash
# Forward webhooks to local development
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Trigger a test event
stripe trigger checkout.session.completed

# Test rate limiting (send multiple requests)
for i in {1..150}; do
  stripe events resend evt_xxxxx &
done
wait
```

### Test Signature Verification

```bash
# Send webhook with invalid signature (should fail)
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: invalid" \
  -d '{"id": "evt_test", "type": "test"}'
```

### Test Rate Limiting

Use a tool like `ab` (Apache Bench) or `wrk` to send multiple requests:

```bash
# Send 200 requests as fast as possible
ab -n 200 -c 10 -H "stripe-signature: test" \
  http://localhost:3000/api/stripe/webhook
```

## Redis Dependency

All security features require Redis to be configured:
- Rate limiting
- Failure tracking

**Graceful Degradation**:
- If Redis is unavailable, requests proceed without rate limiting
- Errors are logged but don't block legitimate traffic
- Consider this when evaluating attack surface

## Security Best Practices

1. **Monitor logs regularly** for security alerts
2. **Set up alerting** for multiple signature failures
3. **Review rate limits** periodically based on traffic patterns
4. **Rotate webhook secrets** quarterly or after suspected compromise
5. **Keep Stripe client library updated** for security patches
6. **Use HTTPS only** (enforced by Stripe)
7. **Restrict webhook endpoint** to Stripe's IP ranges if possible (via firewall/CDN)

## Incident Response

If a security alert is triggered:

1. **Immediate**:
   - Check logs for the offending IP address
   - Review recent webhook activity in Stripe Dashboard
   - Verify webhook secret hasn't been compromised

2. **Investigation**:
   - Determine if attack is ongoing
   - Check for any successful unauthorized requests
   - Review database for any suspicious transactions

3. **Mitigation**:
   - Block offending IPs at firewall/CDN level if confirmed malicious
   - Rotate webhook secret if compromise suspected
   - Increase rate limit restrictions if needed

4. **Follow-up**:
   - Document incident
   - Review and update security measures
   - Consider additional monitoring/alerting

## Related Documentation

- [Stripe Webhook Documentation](https://stripe.com/docs/webhooks)
- [Stripe Security Best Practices](https://stripe.com/docs/security/guide)
- [Redis Rate Limiting Documentation](../src/lib/redis.ts)
- [Testing Guide](./TESTING_GUIDE.md)

## Support

For questions or issues related to webhook security:
1. Check this documentation
2. Review webhook logs in Stripe Dashboard
3. Check application logs for error patterns
4. Review Redis health and connectivity
