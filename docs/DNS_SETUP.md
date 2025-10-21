# DNS Setup Guide for Email Deliverability

This guide covers DNS configuration for Resend email sending on `needatradesman.co.uk`.

## Overview

Proper DNS configuration is critical for email deliverability. Without correct SPF, DKIM, and DMARC records, emails may be marked as spam or rejected entirely.

## Required DNS Records

### 1. SPF (Sender Policy Framework)

**Purpose:** Authorizes Resend to send emails on behalf of your domain.

**Record Type:** TXT  
**Host:** `@` (root domain)  
**Value:** `v=spf1 include:_spf.resend.com ~all`

**Explanation:**
- `v=spf1` - SPF version 1
- `include:_spf.resend.com` - Allow Resend to send
- `~all` - Soft fail for others (recommended)

**Important:** If you already have an SPF record (e.g., for Microsoft 365), merge them:
```
v=spf1 include:_spf.resend.com include:spf.protection.outlook.com ~all
```

### 2. DKIM (DomainKeys Identified Mail)

**Purpose:** Cryptographically signs emails to prove they came from your domain.

**Record Type:** TXT  
**Host:** `resend._domainkey` (or as provided by Resend)  
**Value:** (Long cryptographic key provided by Resend - copy exactly from dashboard)

**Example:**
```
resend._domainkey.needatradesman.co.uk TXT "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN..."
```

**Note:** The actual DKIM key is unique to your Resend account. Get it from:  
[Resend Dashboard → Domains → needatradesman.co.uk → DNS Records](https://resend.com/domains)

### 3. DMARC (Domain-based Message Authentication, Reporting and Conformance)

**Purpose:** Sets policy for emails that fail SPF/DKIM checks and requests reports.

**Record Type:** TXT  
**Host:** `_dmarc`  
**Value:** `v=DMARC1; p=quarantine; rua=mailto:dmarc@needatradesman.co.uk; pct=100; adkim=s; aspf=s`

**Explanation:**
- `v=DMARC1` - DMARC version
- `p=quarantine` - Policy: quarantine failed emails (less strict than `reject`)
- `rua=mailto:dmarc@needatradesman.co.uk` - Send aggregate reports here
- `pct=100` - Apply policy to 100% of emails
- `adkim=s` - Strict DKIM alignment
- `aspf=s` - Strict SPF alignment

**Policy Options:**
- `p=none` - Monitor only (recommended for initial setup)
- `p=quarantine` - Mark as spam
- `p=reject` - Block entirely (most strict)

**Recommendation:** Start with `p=none` to collect reports, then move to `p=quarantine` after verification.

### 4. Return-Path (Optional)

**Purpose:** Specifies where bounce messages should be sent.

**Record Type:** CNAME  
**Host:** `pm-bounces` (or as provided by Resend)  
**Value:** `pm.mtasv.net` (or as provided by Resend)

**Note:** Check Resend dashboard for the exact subdomain and target.

---

## Verification Steps

### 1. Add Records to DNS Provider

Add the records above to your DNS provider (e.g., Cloudflare, GoDaddy, Route 53, etc.).

**Example (Cloudflare):**
1. Log into Cloudflare
2. Select `needatradesman.co.uk` domain
3. Go to DNS → Records
4. Click "Add record"
5. Add each TXT/CNAME record as specified above

### 2. Wait for Propagation

DNS changes can take 5 minutes to 48 hours to propagate. Typically it's quick (5-15 minutes).

### 3. Verify in Resend Dashboard

1. Go to [Resend Domains](https://resend.com/domains)
2. Click on `needatradesman.co.uk`
3. Check verification status for each record:
   - SPF: ✅ Verified
   - DKIM: ✅ Verified
   - Return-Path: ✅ Verified (optional)

### 4. Test DNS Records

Use online tools to verify:

**SPF Check:**
```bash
dig TXT needatradesman.co.uk | grep spf
# Should return: v=spf1 include:_spf.resend.com ~all
```

**DKIM Check:**
```bash
dig TXT resend._domainkey.needatradesman.co.uk
# Should return the DKIM public key
```

**DMARC Check:**
```bash
dig TXT _dmarc.needatradesman.co.uk
# Should return: v=DMARC1; p=quarantine; ...
```

**Online Tools:**
- [MXToolbox DMARC Check](https://mxtoolbox.com/dmarc.aspx)
- [Mail Tester](https://www.mail-tester.com/) - Send test email, get spam score
- [DMARC Analyzer](https://dmarcian.com/dmarc-inspector/)

---

## Common Issues

### SPF Record Already Exists

**Problem:** Your domain already has an SPF record for Microsoft 365 or another service.

**Solution:** Merge the records by adding multiple `include:` statements:
```
v=spf1 include:_spf.resend.com include:spf.protection.outlook.com ~all
```

**Important:** Only one SPF record is allowed per domain. Merge, don't duplicate.

### DKIM Not Verifying

**Problem:** Resend shows DKIM as "Pending" or "Failed"

**Solutions:**
1. Wait 15-30 minutes for DNS propagation
2. Check the TXT record value was copied exactly (no extra spaces or quotes)
3. Verify the host name is exactly as Resend specified (e.g., `resend._domainkey`)
4. Try using the full hostname: `resend._domainkey.needatradesman.co.uk`

### DMARC Policy Too Strict

**Problem:** Emails are being blocked by `p=reject` policy

**Solution:** 
1. Temporarily change to `p=none` or `p=quarantine`
2. Monitor DMARC reports to understand failures
3. Only use `p=reject` after 100% verification and testing

### Multiple DKIM Records

If you have multiple email services (Resend + Microsoft 365), each should have its own DKIM selector:
- `resend._domainkey` for Resend
- `selector1._domainkey` for Microsoft 365

Both can coexist on the same domain.

---

## BIMI (Future Enhancement)

**BIMI (Brand Indicators for Message Identification)** displays your logo in Gmail/Yahoo inboxes.

**Requirements:**
- Fully aligned DMARC with `p=quarantine` or `p=reject`
- Verified trademark
- SVG logo hosted on HTTPS

**Record Example:**
```
_bimi.needatradesman.co.uk TXT "v=BIMI1; l=https://needatradesman.co.uk/logo.svg; a=https://needatradesman.co.uk/vmc.pem"
```

**Not Implemented Yet** - This is a future enhancement.

---

## Dedicated Subdomain (Recommended for Scale)

For better reputation isolation, use a subdomain for sending:

**Example:** `mail.needatradesman.co.uk`

**Benefits:**
- Isolates automated email reputation from human email (M365)
- Easier to manage bounces and complaints
- Follows industry best practices

**Setup:**
1. Create `mail.needatradesman.co.uk` subdomain in DNS
2. Add Resend to this subdomain instead of root
3. Update `EMAIL_FROM` to `noreply@mail.needatradesman.co.uk`
4. Add SPF, DKIM, DMARC for the subdomain

**When to Use:**
- When sending >1,000 emails/day
- After initial verification on root domain
- For improved deliverability

---

## Monitoring & Maintenance

### DMARC Reports

Configure email to receive DMARC aggregate reports:
```
rua=mailto:dmarc@needatradesman.co.uk
```

**Report Format:** XML files emailed daily by receiving mail servers (Gmail, Outlook, etc.)

**Tools to Parse:**
- [Postmark DMARC Digests](https://dmarc.postmarkapp.com/) (free)
- [dmarcian](https://dmarcian.com/) (paid)
- Manual parsing with XML/JSON converters

**What to Look For:**
- DKIM pass rate should be >99%
- SPF pass rate should be >99%
- DMARC pass rate should be >99%
- Check for unauthorized senders

### Regular Checks

**Monthly:**
- Verify DNS records are still in place (some providers auto-delete)
- Check bounce/complaint rates in Resend dashboard
- Review DMARC reports for anomalies

**Quarterly:**
- Test email deliverability with [Mail Tester](https://www.mail-tester.com/)
- Audit email suppression list for false positives
- Review and update DMARC policy if needed

---

## Quick Reference

| Record | Type | Host | Purpose |
|--------|------|------|---------|
| SPF | TXT | @ | Authorize Resend to send |
| DKIM | TXT | resend._domainkey | Sign emails cryptographically |
| DMARC | TXT | _dmarc | Set authentication policy |
| Return-Path | CNAME | pm-bounces | Bounce handling (optional) |

**Verification Tools:**
- [MXToolbox](https://mxtoolbox.com/)
- [Mail Tester](https://www.mail-tester.com/)
- [DMARC Inspector](https://dmarcian.com/dmarc-inspector/)
- [Google Postmaster Tools](https://postmaster.google.com/)

**Support:**
- [Resend Docs](https://resend.com/docs)
- [Resend Support](https://resend.com/support)
