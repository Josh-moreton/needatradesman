# ADR-001: Use Resend for Transactional Email; Microsoft 365 for Human Mailboxes

**Status:** Accepted

**Date:** 2025-10-20

**Decision Makers:** Engineering Team

---

## Context

We need a reliable, observable, and scalable email system for the Need a Tradesman platform to:
- Send transactional emails (welcome, job responses, payment confirmations)
- Send digest emails (daily/weekly job summaries for tradespeople)
- Notify support team of operational exceptions
- Maintain high deliverability and sender reputation
- Support modern email features (List-Unsubscribe, webhooks, templates)

There was initial confusion about using Microsoft 365 (M365) vs. a dedicated transactional email service.

## Decision

We will **standardize on Resend** for all application-generated emails (transactional + digests), and use **Microsoft 365** exclusively for human mailboxes (e.g., support@needatradesman.co.uk, team inboxes).

### Architecture
- **Resend:** All automated emails from the application
  - Welcome emails
  - Job response notifications
  - Daily/weekly job digests
  - Payment confirmations
  - Support alerts
- **Microsoft 365:** Human-operated email accounts only
  - support@needatradesman.co.uk (support team inbox)
  - Shared mailboxes for internal collaboration
  - No programmatic sending

### Sending Domain
- Use `noreply@needatradesman.co.uk` as the sender address for Resend
- Consider dedicated subdomain `mail.needatradesman.co.uk` in future for reputation isolation

## Rationale

### Why Resend for Transactional Email?

1. **Purpose-Built for Developers**
   - React Email template support (type-safe, version-controlled)
   - Simple Node.js SDK that integrates seamlessly with Next.js
   - Better DX than SMTP or M365 Graph API

2. **Superior Deliverability**
   - Dedicated sending infrastructure optimized for transactional email
   - Automatic bounce and complaint handling
   - Better inbox placement rates than M365 for bulk sends
   - Domain isolation prevents human email issues from affecting app emails

3. **Modern Features**
   - Webhook support for bounces, complaints, opens, clicks
   - List-Unsubscribe headers (RFC 8058 one-click)
   - Built-in analytics and email tracking
   - Template versioning and preview

4. **Observability & Debugging**
   - Per-message tracking with message IDs
   - Searchable email logs
   - Webhook events for automated suppression
   - Better error messages than SMTP

5. **Scalability & Cost**
   - Generous free tier (100 emails/day, 3,000/month)
   - Pay-as-you-grow pricing
   - No infrastructure to manage
   - Better than M365 Graph API rate limits

6. **Industry Standard Practice**
   - Separating transactional from human email is industry best practice
   - Companies like Stripe, GitHub, Vercel all use dedicated services
   - Prevents reputation damage from spam/bounce issues

### Why NOT M365 for Transactional Email?

1. **Complexity:** Graph API or SMTP auth is more complex than Resend SDK
2. **Rate Limits:** M365 has stricter sending limits (30 messages/minute, 10,000/day)
3. **Deliverability:** Not optimized for bulk/transactional sending
4. **Reputation Risk:** Mixing human and automated email can hurt deliverability
5. **Observability:** Limited webhook support, harder to debug
6. **Templates:** No native React Email support, harder to version control

### Why Keep M365?

- Already configured and working well for support@ inbox
- Team familiarity with Outlook/Exchange
- Good for human-to-human communication
- Compliance and archival features for business email

## Consequences

### Positive
- ✅ Better email deliverability and inbox placement
- ✅ Easier debugging with message IDs and webhooks
- ✅ Type-safe, version-controlled email templates with React
- ✅ Automated bounce/complaint suppression
- ✅ Cleaner separation of concerns
- ✅ Industry-standard approach

### Negative
- ❌ Additional service to configure (DNS records for Resend)
- ❌ Monthly cost once free tier is exceeded (minimal for early stage)
- ❌ Another vendor dependency

### Neutral
- 🔵 Need to configure SPF/DKIM/DMARC for sending domain
- 🔵 Two email systems to monitor (but clear separation)

## Implementation

1. **DNS Configuration**
   - Add Resend SPF, DKIM, and DMARC records for `needatradesman.co.uk`
   - Verify domain in Resend dashboard

2. **Environment Variables**
   ```
   RESEND_API_KEY=re_...
   EMAIL_FROM="Need A Tradesman <noreply@needatradesman.co.uk>"
   SUPPORT_TEAM_EMAIL="support@needatradesman.co.uk"
   RESEND_WEBHOOK_SECRET=whsec_...
   ```

3. **Code Structure**
   - Email templates in `src/lib/emails/templates.tsx` (React Email)
   - Notification service in `src/lib/notifications/service.ts`
   - Idempotency and preference management
   - Webhook endpoint at `/api/emails/webhook`

4. **Monitoring**
   - Resend dashboard for delivery stats
   - Application logs with correlation IDs
   - Email event database table for audit trail

## Compliance

- **GDPR:** Preference management allows opt-out of digests
- **CAN-SPAM:** List-Unsubscribe headers on all digest emails
- **Privacy:** Only necessary PII in emails, no sensitive data

## Future Considerations

- Move to dedicated subdomain `mail.needatradesman.co.uk` for sending
- Implement BIMI for brand indicator in Gmail
- Add AMP for Email support for interactive content
- Consider Resend Broadcasts for marketing (or separate tool)

## References

- [Resend Documentation](https://resend.com/docs)
- [React Email](https://react.email)
- [RFC 8058: List-Unsubscribe](https://datatracker.ietf.org/doc/html/rfc8058)
- [Email Deliverability Best Practices](https://resend.com/docs/knowledge-base/best-practices)

## Related Documents

- `docs/RESEND_INTEGRATION.md` - Integration guide
- `docs/email-runbook.md` - Operations runbook
- `docs/DNS_SETUP.md` - DNS configuration guide
