# Email System Operations Runbook

**Audience:** Support team, DevOps, On-call engineers  
**Purpose:** Troubleshoot and manage the email notification system

---

## Table of Contents
- [Quick Health Check](#quick-health-check)
- [Common Issues](#common-issues)
- [Emergency Procedures](#emergency-procedures)
- [Monitoring](#monitoring)
- [Routine Maintenance](#routine-maintenance)
- [Escalation](#escalation)

---

## Quick Health Check

### 1. Check Resend Dashboard
**URL:** [https://resend.com/emails](https://resend.com/emails)

**What to Check:**
- ✅ Delivery rate >98%
- ✅ Bounce rate <2%
- ✅ Complaint rate <0.1%
- ✅ No API errors

### 2. Check Database
```sql
-- Recent email events (last 24h)
SELECT status, COUNT(*) 
FROM email_events 
WHERE "createdAt" > NOW() - INTERVAL '24 hours' 
GROUP BY status;

-- Expected: Most should be 'SENT'
-- PENDING is okay if recent
-- FAILED needs investigation
-- SUPPRESSED is normal for known bounces

-- Recent suppressions
SELECT reason, COUNT(*) 
FROM email_suppressions 
WHERE "createdAt" > NOW() - INTERVAL '7 days' 
GROUP BY reason;

-- Normal: Some BOUNCE/COMPLAINT
-- Concern: Sudden spike in suppressions
```

### 3. Test Email Send
```bash
# Send yourself a test email via API
curl -X POST https://needatradesman.co.uk/api/emails/preferences \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -H "Content-Type: application/json"
```

**Expected:** Email received within 30 seconds

---

## Common Issues

### Issue: User Not Receiving Emails

**Symptoms:** User reports not receiving job notifications or digests

**Diagnosis:**
1. Check if email is suppressed:
   ```sql
   SELECT * FROM email_suppressions WHERE email = 'user@example.com';
   ```

2. Check email preferences:
   ```sql
   SELECT ep.* FROM email_preferences ep
   JOIN users u ON u.id = ep."userId"
   WHERE u.email = 'user@example.com';
   ```

3. Check recent email events:
   ```sql
   SELECT * FROM email_events 
   WHERE "recipientEmail" = 'user@example.com' 
   ORDER BY "createdAt" DESC LIMIT 10;
   ```

**Solutions:**

**If suppressed due to bounce:**
```sql
-- Remove from suppression list (use cautiously)
DELETE FROM email_suppressions 
WHERE email = 'user@example.com' AND reason = 'BOUNCE';
```
*Only do this if user confirms the email address is now valid.*

**If digest frequency is NEVER:**
```sql
-- Re-enable digest
UPDATE email_preferences 
SET "allowDigest" = true, "digestFrequency" = 'WEEKLY' 
WHERE "userId" = '<user_id>';
```

**If emails going to spam:**
- Ask user to check spam folder
- Ask user to whitelist `noreply@needatradesman.co.uk`
- Check domain reputation in [Google Postmaster](https://postmaster.google.com/)

---

### Issue: Emails Going to Spam

**Symptoms:** Users report emails in spam folder, low open rates

**Diagnosis:**
1. Send test email to [Mail Tester](https://www.mail-tester.com/)
2. Check SPF/DKIM/DMARC alignment in Resend dashboard
3. Review bounce/complaint rates (should be <2% and <0.1% respectively)

**Solutions:**

**DNS Issues:**
```bash
# Verify SPF record
dig TXT needatradesman.co.uk | grep spf

# Verify DKIM record
dig TXT resend._domainkey.needatradesman.co.uk

# Verify DMARC record
dig TXT _dmarc.needatradesman.co.uk
```

If any are missing, see [DNS_SETUP.md](./DNS_SETUP.md) for configuration.

**Content Issues:**
- Avoid ALL CAPS in subject lines
- Avoid excessive exclamation marks (!!!)
- Include unsubscribe link (already in digests)
- Don't use link shorteners

**Reputation Issues:**
- Check [Google Postmaster Tools](https://postmaster.google.com/)
- Review DMARC reports for unauthorized senders
- Consider dedicated subdomain `mail.needatradesman.co.uk`

---

### Issue: Duplicate Emails Sent

**Symptoms:** User receives same email multiple times

**Diagnosis:**
1. Check idempotency key:
   ```sql
   SELECT * FROM email_events 
   WHERE "recipientEmail" = 'user@example.com' 
   AND "eventType" = 'JobResponded'
   ORDER BY "createdAt" DESC LIMIT 10;
   ```

2. Look for duplicate `idempotencyKey` values
3. Check application logs for retry logic

**Solution:**
- Idempotency should prevent this automatically
- If it happens, check for bugs in event emission code
- Review `emitEmailEvent` calls for proper error handling

**Immediate Fix:**
```sql
-- Mark duplicate as FAILED to prevent further sends
UPDATE email_events 
SET status = 'FAILED', "errorMessage" = 'Duplicate prevented by support' 
WHERE id = '<duplicate_event_id>';
```

---

### Issue: Digest Not Sending

**Symptoms:** Tradespeople not receiving daily/weekly digests

**Diagnosis:**
1. Check if cron job ran:
   ```bash
   # Check Vercel logs for cron execution
   vercel logs --since 24h | grep digest
   ```

2. Check user preferences:
   ```sql
   SELECT u.email, ep."digestFrequency", ep."allowDigest" 
   FROM email_preferences ep
   JOIN users u ON u.id = ep."userId"
   WHERE u.role = 'TRADESPERSON' 
   AND ep."allowDigest" = true;
   ```

3. Check if jobs exist:
   ```sql
   SELECT COUNT(*) FROM jobs 
   WHERE status = 'OPEN' 
   AND "createdAt" > NOW() - INTERVAL '24 hours';
   ```

**Solutions:**

**Cron not running:**
- Verify `vercel.json` cron configuration
- Check `CRON_SECRET` environment variable is set
- Manually trigger: `GET /api/cron/daily-digest`

**No jobs matching preferences:**
- User may have overly restrictive filters
- Check `professionFilters` and `regionFilters`
- Adjust or clear filters if too narrow

**User opted out:**
- Confirm with user they want digests
- Update `allowDigest` to `true` if needed

---

### Issue: High Bounce Rate

**Symptoms:** Bounce rate >5% in Resend dashboard

**Diagnosis:**
1. Check suppression list growth:
   ```sql
   SELECT DATE("createdAt"), COUNT(*) 
   FROM email_suppressions 
   WHERE reason = 'BOUNCE' 
   GROUP BY DATE("createdAt") 
   ORDER BY DATE("createdAt") DESC 
   LIMIT 7;
   ```

2. Identify patterns:
   ```sql
   SELECT email, "createdAt" 
   FROM email_suppressions 
   WHERE reason = 'BOUNCE' 
   ORDER BY "createdAt" DESC LIMIT 50;
   ```

**Solutions:**

**Hard Bounces (permanent):**
- Normal to see some hard bounces
- Emails are automatically suppressed
- Monitor for spikes (may indicate data quality issue)

**Soft Bounces (temporary):**
- Inbox full, server down, etc.
- Resend retries automatically
- Don't suppress unless repeated

**Data Quality:**
- Review user email validation during signup
- Consider email verification on registration
- Clean up obviously invalid emails

---

## Emergency Procedures

### Emergency: All Emails Stopped Sending

**Immediate Actions:**
1. Check Resend status: [https://status.resend.com/](https://status.resend.com/)
2. Check Vercel status: [https://status.vercel.com/](https://status.vercel.com/)
3. Verify `RESEND_API_KEY` environment variable is set
4. Check recent deployments (may have broken something)

**Verify API Key:**
```bash
curl https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from": "noreply@needatradesman.co.uk", "to": "test@example.com", "subject": "Test", "html": "<p>Test</p>"}'
```

**Check Database:**
```sql
-- Recent failed emails
SELECT "errorMessage", COUNT(*) 
FROM email_events 
WHERE status = 'FAILED' 
AND "createdAt" > NOW() - INTERVAL '1 hour' 
GROUP BY "errorMessage";
```

**Escalate to:** Engineering lead if Resend/Vercel are operational and API key is valid

---

### Emergency: Mass Spam Complaints

**Symptoms:** Sudden spike in complaint suppressions, Resend domain suspended

**Immediate Actions:**
1. **Stop all non-critical emails:**
   ```sql
   -- Temporarily disable all digests
   UPDATE email_preferences SET "allowDigest" = false;
   ```

2. **Identify source:**
   ```sql
   SELECT "eventType", COUNT(*) 
   FROM email_events 
   WHERE "recipientEmail" IN (
     SELECT email FROM email_suppressions WHERE reason = 'COMPLAINT'
   ) 
   GROUP BY "eventType";
   ```

3. **Review content:**
   - Check email templates for spam triggers
   - Verify unsubscribe link is prominent
   - Review subject lines and sender name

4. **Contact Resend support immediately:** [support@resend.com](mailto:support@resend.com)

5. **Notify leadership:** This is a critical issue affecting deliverability

---

## Monitoring

### Daily Checks (Automated)

Set up alerts for:
- Bounce rate >5%
- Complaint rate >0.5%
- Email send failures >10/hour
- Cron job failures

### Weekly Review

1. **Email Stats:**
   ```sql
   -- Last 7 days summary
   SELECT 
     DATE("createdAt") as date,
     status,
     COUNT(*) as count
   FROM email_events 
   WHERE "createdAt" > NOW() - INTERVAL '7 days' 
   GROUP BY DATE("createdAt"), status 
   ORDER BY date DESC, status;
   ```

2. **Suppression Growth:**
   ```sql
   -- New suppressions this week
   SELECT reason, COUNT(*) 
   FROM email_suppressions 
   WHERE "createdAt" > NOW() - INTERVAL '7 days' 
   GROUP BY reason;
   ```

3. **Digest Performance:**
   ```sql
   -- Digest emails sent this week
   SELECT COUNT(*) 
   FROM email_events 
   WHERE "eventType" = 'JobDigestReady' 
   AND "createdAt" > NOW() - INTERVAL '7 days';
   ```

### Monthly Review

1. Review DMARC reports
2. Check domain reputation in Google Postmaster
3. Audit email templates for improvements
4. Clean up old suppression records (if any are confirmed false positives)

---

## Routine Maintenance

### Clean Up Old Email Events (Monthly)

```sql
-- Archive events older than 90 days
-- (Only if storage is a concern - otherwise keep for audit)
DELETE FROM email_events 
WHERE "createdAt" < NOW() - INTERVAL '90 days' 
AND status = 'SENT';
```

### Review Suppressions (Quarterly)

```sql
-- Find suppressions older than 6 months
SELECT * FROM email_suppressions 
WHERE "createdAt" < NOW() - INTERVAL '6 months';
```

- Contact users to verify email addresses are still invalid
- Remove if user confirms address is now valid

### Update Email Templates (As Needed)

When updating templates:
1. Test locally with `pnpm dev`
2. Send test emails to yourself
3. Use [Litmus](https://litmus.com/) or [Email on Acid](https://www.emailonacid.com/) for client testing
4. Deploy during low-traffic hours
5. Monitor for increased bounces/complaints

---

## Escalation

### L1 Support (Support Team)
- User reports not receiving emails
- Basic preference management
- Unsubscribe requests

### L2 Support (DevOps)
- DNS issues
- Webhook not processing
- High bounce/complaint rates
- Cron job failures

### L3 Support (Engineering)
- Template bugs
- Code changes needed
- Integration issues
- Resend API errors

### Critical Issues (Engineering Lead)
- Domain suspended
- Mass spam complaints
- All emails stopped
- Security incidents

---

## Contact Information

- **Resend Support:** [support@resend.com](mailto:support@resend.com)
- **Engineering Lead:** (Internal contact)
- **DevOps On-Call:** (Internal contact)

---

## Useful Links

- [Resend Dashboard](https://resend.com/emails)
- [Resend Status Page](https://status.resend.com/)
- [Vercel Logs](https://vercel.com/needatradesman/logs)
- [Google Postmaster Tools](https://postmaster.google.com/)
- [Mail Tester](https://www.mail-tester.com/)
- [ADR: Use Resend](./adr/001-use-resend-for-transactional-email.md)
- [DNS Setup Guide](./DNS_SETUP.md)
