# Deployment Guide

## Overview

This guide covers deploying the Need A Tradesman marketplace to production using Vercel as the recommended platform.

## Prerequisites

- Vercel account
- PostgreSQL database (recommended: Supabase, Neon, or PlanetScale)
- Redis instance (recommended: Upstash Redis)
- Clerk account for authentication
- Stripe account for payments
- Pusher account for real-time features

## Environment Setup

### 1. Database Setup

#### Option A: Supabase (Recommended)
1. Create a new project at [supabase.com](https://supabase.com)
2. Copy the connection string from Settings > Database
3. Run database migrations: `npx prisma migrate deploy`

#### Option B: Neon
1. Create a new project at [neon.tech](https://neon.tech)
2. Copy the connection string
3. Run database migrations: `npx prisma migrate deploy`

### 2. Redis Setup (Upstash)
1. Create a new database at [upstash.com](https://upstash.com)
2. Copy the Redis URL from the database dashboard

### 3. External Services

#### Clerk Authentication
1. Create a new application at [clerk.com](https://clerk.com)
2. Configure allowed domains for your production URL
3. Copy the API keys from the dashboard

#### Stripe Payments
1. Activate your account at [stripe.com](https://stripe.com)
2. Set up Stripe Connect for marketplace functionality
3. Copy live API keys (ensure test mode is disabled)
4. Configure webhooks for your production domain

#### Pusher Real-time
1. Create a new app at [pusher.com](https://pusher.com)
2. Configure CORS settings for your production domain
3. Copy the app credentials

## Vercel Deployment

### 1. Initial Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to Vercel
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set build command: npm run build
# - Set output directory: .next
```

### 2. Environment Variables

Add the following environment variables in the Vercel dashboard (Settings > Environment Variables):

```bash
# Database
DATABASE_URL=your_production_database_url

# Authentication
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
NEXTAUTH_SECRET=your_32_character_secret

# Redis
REDIS_URL=your_redis_url

# Pusher
PUSHER_APP_ID=your_app_id
PUSHER_KEY=your_key
PUSHER_SECRET=your_secret
PUSHER_CLUSTER=your_cluster
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=your_cluster

# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 3. Domain Configuration

1. Add your custom domain in Vercel dashboard
2. Configure DNS records as instructed
3. Update Clerk, Stripe, and Pusher settings with new domain

### 4. Database Migration

```bash
# Run migrations on production database
npx prisma migrate deploy

# Generate Prisma client for production
npx prisma generate
```

## Post-Deployment Checklist

### 1. Verify Health Checks
- [ ] Visit `/api/health` - should return 200 OK
- [ ] Visit `/api/ready` - should return 200 OK
- [ ] Check all services are healthy

### 2. Test Core Functionality
- [ ] User registration and login
- [ ] Job posting and browsing
- [ ] Application submission
- [ ] Real-time messaging
- [ ] Payment processing (with test cards first)

### 3. Monitor Performance
- [ ] Check Vercel Analytics dashboard
- [ ] Monitor error rates in Vercel logs
- [ ] Verify database performance
- [ ] Check Redis cache hit rates

### 4. Security Verification
- [ ] Verify HTTPS is enforced
- [ ] Check security headers are applied
- [ ] Test rate limiting functionality
- [ ] Verify authentication flows

## Monitoring & Alerts

### 1. Vercel Monitoring
- Enable Vercel Analytics
- Set up deployment notifications
- Monitor function execution logs

### 2. Database Monitoring
- Set up database performance alerts
- Monitor connection pool usage
- Configure backup verification

### 3. External Service Monitoring
- Monitor Stripe webhook delivery
- Check Pusher connection metrics
- Verify Redis performance

### 4. Uptime Monitoring
Recommended external services:
- [UptimeRobot](https://uptimerobot.com)
- [Pingdom](https://pingdom.com)
- [StatusCake](https://statuscake.com)

Configure monitoring for:
- Main application URL
- `/api/health` endpoint
- `/api/ready` endpoint

## Backup Strategy

### 1. Database Backups
- Configure automatic daily backups
- Test backup restoration procedure
- Document recovery time objectives

### 2. Environment Configuration Backup
- Document all environment variables
- Store configuration securely (e.g., 1Password, AWS Secrets Manager)
- Regular configuration audits

## Incident Response

### 1. Escalation Procedures
1. **P0 (Critical)**: Complete service outage
   - Immediate notification to on-call engineer
   - Begin incident response within 15 minutes

2. **P1 (High)**: Significant feature degradation
   - Notification within 1 hour
   - Begin response within 2 hours

3. **P2 (Medium)**: Minor feature issues
   - Notification within 4 hours
   - Begin response within 8 hours

### 2. Recovery Procedures

#### Database Issues
1. Check database connectivity via health check
2. Review database logs for errors
3. Contact database provider support if needed
4. Implement read-only mode if necessary

#### Application Issues
1. Check Vercel deployment logs
2. Verify environment variable configuration
3. Roll back to previous deployment if necessary
4. Scale functions if performance issue

#### External Service Issues
1. Check service status pages (Stripe, Clerk, Pusher)
2. Implement graceful degradation
3. Notify users of temporary limitations
4. Monitor for service recovery

## Rollback Procedure

### 1. Application Rollback
```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback [deployment-url]
```

### 2. Database Rollback
```bash
# Only if migration needs to be reverted
# WARNING: This may cause data loss
npx prisma migrate reset
npx prisma migrate deploy
```

### 3. Configuration Rollback
1. Revert environment variables in Vercel dashboard
2. Update external service configurations
3. Verify all services are working

## Performance Optimization

### 1. Application Level
- Enable Next.js optimization features
- Implement proper caching strategies
- Optimize database queries
- Use Redis for session storage

### 2. Infrastructure Level
- Configure Vercel Edge Functions for global performance
- Use Vercel Image Optimization
- Implement proper CDN configuration
- Monitor and optimize bundle sizes

### 3. Database Optimization
- Implement proper indexing
- Monitor query performance
- Use connection pooling
- Consider read replicas for high traffic

## Security Best Practices

### 1. Regular Security Audits
- Run `npm audit` regularly
- Update dependencies monthly
- Review security headers configuration
- Audit user permissions and access

### 2. Monitoring Security Events
- Monitor failed authentication attempts
- Track suspicious API usage
- Alert on unusual traffic patterns
- Regular access log reviews

### 3. Data Protection
- Encrypt sensitive data at rest
- Implement proper data retention policies
- Regular backup testing
- GDPR compliance verification

## Cost Optimization

### 1. Resource Monitoring
- Monitor Vercel function execution costs
- Track database usage and costs
- Optimize Redis memory usage
- Review external service costs

### 2. Performance vs Cost Balance
- Optimize function cold starts
- Implement efficient caching
- Monitor bandwidth usage
- Regular cost analysis and optimization