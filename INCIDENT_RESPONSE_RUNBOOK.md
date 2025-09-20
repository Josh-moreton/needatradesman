# Incident Response Runbook

## Overview

This runbook provides step-by-step procedures for responding to production incidents in the Need A Tradesman marketplace.

## Incident Classification

### Severity Levels

#### P0 - Critical (Complete Service Outage)
- **Examples**: Site completely down, database inaccessible, payment processing completely broken
- **Response Time**: 15 minutes
- **Escalation**: Immediate notification to all on-call engineers
- **Customer Impact**: All users affected, business operations stopped

#### P1 - High (Major Feature Degradation)
- **Examples**: Login failures, job posting broken, payment issues affecting >50% of transactions
- **Response Time**: 1 hour
- **Escalation**: Primary on-call engineer
- **Customer Impact**: Significant user impact, core features unavailable

#### P2 - Medium (Minor Feature Issues)
- **Examples**: Search filters not working, notification delays, UI rendering issues
- **Response Time**: 4 hours
- **Escalation**: During business hours
- **Customer Impact**: Some users affected, workarounds available

#### P3 - Low (Cosmetic Issues)
- **Examples**: Styling issues, non-critical feature bugs, performance degradation
- **Response Time**: Next business day
- **Escalation**: Regular development queue
- **Customer Impact**: Minimal user impact

## Contact Information

### Primary Contacts
- **Lead Engineer**: [Your contact info]
- **DevOps/Infrastructure**: [Your contact info]
- **Product Owner**: [Your contact info]
- **Customer Support**: [Your contact info]

### External Vendor Contacts
- **Vercel Support**: support@vercel.com
- **Database Provider**: [Your database provider support]
- **Stripe Support**: support@stripe.com
- **Clerk Support**: support@clerk.com

## Initial Response Procedures

### Step 1: Incident Detection (0-5 minutes)
1. **Alert Received**
   - Check monitoring dashboards
   - Verify the incident scope
   - Confirm it's not a false alarm

2. **Initial Assessment**
   ```bash
   # Quick health check
   curl https://your-domain.com/api/health
   curl https://your-domain.com/api/ready
   
   # Check Vercel dashboard
   # Check external service status pages
   ```

3. **Create Incident Channel**
   - Create dedicated Slack/Teams channel
   - Add relevant stakeholders
   - Pin important updates

### Step 2: Incident Triage (5-15 minutes)
1. **Determine Severity**
   - Use classification above
   - Document in incident channel

2. **Gather Information**
   ```bash
   # Check application logs
   vercel logs
   
   # Check recent deployments
   vercel ls
   
   # Check database status
   # Check Redis status
   # Check external service status
   ```

3. **Initial Communication**
   - Notify stakeholders based on severity
   - Update status page if available
   - Prepare customer communication

### Step 3: Investigation and Mitigation (15+ minutes)
Follow specific runbooks based on issue type (see sections below)

## Service-Specific Runbooks

### Database Issues

#### Symptoms
- Health check showing database unhealthy
- 500 errors related to database queries
- Slow response times
- Connection timeouts

#### Investigation Steps
1. **Check Database Status**
   ```bash
   # Test database connectivity
   curl https://your-domain.com/api/health
   
   # Check database provider dashboard
   # Review connection pool status
   # Check for long-running queries
   ```

2. **Common Causes and Solutions**
   - **Connection pool exhausted**: Restart application, review connection usage
   - **Database overload**: Identify slow queries, consider read replicas
   - **Provider outage**: Check provider status, wait for resolution
   - **Migration issues**: Review recent schema changes, consider rollback

#### Mitigation Steps
1. **Immediate Actions**
   ```bash
   # If application restart needed
   vercel redeploy
   
   # If database migration rollback needed (CAREFUL!)
   npx prisma migrate reset
   ```

2. **Communication**
   - Notify users if data operations are affected
   - Provide ETA if available
   - Document workarounds

### Application Issues

#### Symptoms
- 500 errors in application logs
- JavaScript errors in browser console
- Deployment failures
- Function timeouts

#### Investigation Steps
1. **Check Recent Changes**
   ```bash
   # Check recent deployments
   vercel ls
   
   # Review commit history
   git log --oneline -10
   
   # Check environment variables
   # Review build logs
   ```

2. **Common Causes and Solutions**
   - **Bad deployment**: Rollback to previous version
   - **Environment variable issues**: Verify configuration
   - **Dependency issues**: Check package.json changes
   - **Memory/timeout issues**: Optimize functions or increase limits

#### Mitigation Steps
1. **Quick Rollback**
   ```bash
   # Rollback to previous deployment
   vercel rollback [previous-deployment-url]
   ```

2. **Environment Fix**
   ```bash
   # Update environment variables in Vercel dashboard
   # Redeploy after env changes
   vercel redeploy
   ```

### Authentication Issues (Clerk)

#### Symptoms
- Users unable to log in
- Authentication redirects failing
- JWT token errors
- Session management issues

#### Investigation Steps
1. **Check Clerk Status**
   - Visit Clerk status page
   - Check Clerk dashboard for alerts
   - Verify API key configuration
   - Review domain settings

2. **Common Causes and Solutions**
   - **Clerk service outage**: Wait for resolution, implement fallback if available
   - **Domain misconfiguration**: Update allowed domains in Clerk dashboard
   - **API key issues**: Verify environment variables
   - **Webhook failures**: Check webhook endpoint health

#### Mitigation Steps
1. **Immediate Actions**
   - Verify Clerk configuration in dashboard
   - Check environment variables are correct
   - Test authentication flow manually

2. **Communication**
   - Notify users about login issues
   - Provide workarounds if available
   - Regular updates on resolution progress

### Payment Issues (Stripe)

#### Symptoms
- Payment failures
- Webhook delivery failures
- Connect account issues
- Refund processing errors

#### Investigation Steps
1. **Check Stripe Dashboard**
   - Review error logs
   - Check webhook delivery status
   - Verify Connect account status
   - Review payment intent logs

2. **Common Causes and Solutions**
   - **Webhook endpoint down**: Fix endpoint, replay missed webhooks
   - **API key issues**: Verify environment variables
   - **Connect account issues**: Review account verification status
   - **Payment method failures**: Check for bank/card issues

#### Mitigation Steps
1. **Immediate Actions**
   ```bash
   # Test webhook endpoint
   curl -X POST https://your-domain.com/api/stripe/webhook \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   
   # Check Stripe configuration
   # Verify webhook secret
   ```

2. **Communication**
   - Notify affected customers
   - Provide alternative payment methods if available
   - Document transaction issues for follow-up

### Real-time Messaging Issues (Pusher)

#### Symptoms
- Messages not delivered in real-time
- Connection failures
- Pusher authentication errors
- Chat interface not loading

#### Investigation Steps
1. **Check Pusher Dashboard**
   - Review connection metrics
   - Check authentication logs
   - Verify CORS settings
   - Review API usage limits

2. **Common Causes and Solutions**
   - **CORS issues**: Update allowed origins in Pusher dashboard
   - **Authentication failures**: Verify server-side auth endpoint
   - **Rate limiting**: Review usage and upgrade plan if needed
   - **Client-side errors**: Check browser console for errors

#### Mitigation Steps
1. **Quick Fixes**
   - Verify Pusher credentials
   - Check CORS configuration
   - Test authentication endpoint
   - Review client-side implementation

2. **Fallback Options**
   - Implement polling fallback for critical features
   - Notify users about real-time feature issues
   - Provide page refresh workaround

### Performance Issues

#### Symptoms
- Slow page load times
- API response timeouts
- High memory usage
- Function execution limits exceeded

#### Investigation Steps
1. **Performance Monitoring**
   ```bash
   # Check Vercel analytics
   # Review function execution times
   # Monitor database query performance
   # Check Redis cache hit rates
   ```

2. **Common Causes and Solutions**
   - **Slow database queries**: Optimize queries, add indexes
   - **Large bundle sizes**: Analyze and optimize JavaScript bundles
   - **Memory leaks**: Review code for memory usage patterns
   - **Cache misses**: Review caching strategy

#### Mitigation Steps
1. **Immediate Actions**
   - Scale up resources if possible
   - Enable emergency caching
   - Optimize critical user paths
   - Consider feature toggles to reduce load

2. **Long-term Solutions**
   - Code optimization
   - Infrastructure scaling
   - Performance monitoring improvements

## Post-Incident Procedures

### Step 1: Resolution Confirmation (0-30 minutes after fix)
1. **Verify Fix**
   ```bash
   # Run health checks
   curl https://your-domain.com/api/health
   curl https://your-domain.com/api/ready
   
   # Test critical user flows
   # Monitor metrics for stability
   ```

2. **Update Communications**
   - Notify stakeholders of resolution
   - Update status page
   - Thank users for patience

### Step 2: Documentation (Within 24 hours)
1. **Incident Summary**
   - Timeline of events
   - Root cause analysis
   - Impact assessment
   - Resolution steps taken

2. **Update Runbooks**
   - Add new scenarios discovered
   - Improve detection methods
   - Update contact information

### Step 3: Post-Mortem (Within 1 week)
1. **Conduct Blameless Post-Mortem**
   - What went well?
   - What could be improved?
   - What actions will prevent recurrence?

2. **Action Items**
   - Assign owners for improvements
   - Set deadlines for implementation
   - Schedule follow-up reviews

## Escalation Matrix

### P0 Incidents
1. **0-15 minutes**: Primary on-call engineer
2. **15-30 minutes**: Lead engineer + DevOps
3. **30-60 minutes**: Product owner + Management
4. **60+ minutes**: Executive team

### P1 Incidents
1. **0-1 hour**: Primary on-call engineer
2. **1-2 hours**: Lead engineer
3. **2-4 hours**: Product owner
4. **4+ hours**: Management

### Communication Templates

#### Initial Alert
```
🚨 INCIDENT ALERT 🚨
Severity: [P0/P1/P2/P3]
Issue: [Brief description]
Impact: [User impact description]
ETA: [Estimated resolution time or "Investigating"]
Updates: [Where to find updates]
```

#### Resolution Notice
```
✅ INCIDENT RESOLVED ✅
Issue: [Brief description]
Duration: [How long the incident lasted]
Resolution: [What was done to fix it]
Next Steps: [Any follow-up actions]
```

## Emergency Contacts Quick Reference

| Service | Status Page | Support |
|---------|-------------|---------|
| Vercel | status.vercel.com | support@vercel.com |
| Stripe | status.stripe.com | support@stripe.com |
| Clerk | status.clerk.com | support@clerk.com |
| Pusher | status.pusher.com | support@pusher.com |

## Quick Commands Reference

```bash
# Health checks
curl https://your-domain.com/api/health
curl https://your-domain.com/api/ready

# Vercel operations
vercel logs
vercel ls
vercel rollback [deployment-url]
vercel redeploy

# Prisma operations
npx prisma migrate status
npx prisma migrate deploy
npx prisma generate

# Common debugging
npm audit
npm run lint
npm run build
```

---

**Remember**: Stay calm, communicate frequently, and document everything. The goal is to restore service quickly while learning from each incident to improve our systems.