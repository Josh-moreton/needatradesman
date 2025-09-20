# Monitoring and Alerting Configuration

## Overview

This document outlines the monitoring and alerting strategy for the Need A Tradesman marketplace to ensure production reliability and performance.

## Monitoring Architecture

### Application Performance Monitoring (APM)
- **Platform**: Vercel Analytics + Custom metrics
- **Metrics Tracked**: Response times, error rates, throughput
- **Real-time Dashboards**: Performance trends, user analytics

### Infrastructure Monitoring
- **Database**: PostgreSQL performance metrics
- **Cache**: Redis performance and hit rates
- **External Services**: Stripe, Clerk, Pusher health
- **CDN**: Vercel Edge Network performance

### Health Check Endpoints

#### Primary Health Check (`/api/health`)
**Purpose**: Overall system health for load balancer decisions

**Response Format**:
```json
{
  "status": "healthy|unhealthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "services": {
    "database": "healthy|unhealthy|unavailable",
    "redis": "healthy|unhealthy|unavailable",
    "pusher": "healthy|unhealthy|unavailable",
    "stripe": "healthy|unhealthy|unavailable"
  },
  "responseTimeMs": 150,
  "errors": ["Optional error messages"]
}
```

**Monitoring Configuration**:
- **Check Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Failure Threshold**: 3 consecutive failures
- **Alert Trigger**: Status 503 or timeout

#### Readiness Check (`/api/ready`)
**Purpose**: Application readiness for traffic

**Response Format**:
```json
{
  "status": "ready|not_ready",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "database": "pass|fail",
    "environment": "pass|fail"
  },
  "responseTimeMs": 50
}
```

**Monitoring Configuration**:
- **Check Interval**: 60 seconds
- **Used For**: Deployment readiness
- **Alert Trigger**: Status not_ready for >5 minutes

## Key Performance Indicators (KPIs)

### Application Metrics

#### Response Time Metrics
- **P50 Response Time**: < 500ms
- **P95 Response Time**: < 2000ms
- **P99 Response Time**: < 5000ms

#### Error Rate Metrics
- **Overall Error Rate**: < 1%
- **5xx Error Rate**: < 0.5%
- **4xx Error Rate**: < 5%

#### Throughput Metrics
- **Requests per Second**: Monitor baseline and peaks
- **Concurrent Users**: Track active user sessions
- **Function Invocations**: Monitor Vercel function usage

### Business Metrics

#### User Engagement
- **Daily Active Users**: Track engagement trends
- **Session Duration**: Monitor user experience
- **Feature Usage**: Track core feature adoption

#### Transaction Metrics
- **Payment Success Rate**: > 98%
- **Job Posting Rate**: Track marketplace activity
- **Message Delivery Rate**: > 99%

#### Conversion Metrics
- **Registration Conversion**: Track signup funnel
- **Job Application Rate**: Monitor marketplace health
- **Payment Completion Rate**: Track transaction success

## Alerting Strategy

### Alert Severity Levels

#### Critical (P0) - Immediate Response Required
**Response Time**: 15 minutes
**Escalation**: Call + SMS + Slack

**Triggers**:
- Health check failing for >3 minutes
- Error rate >5% for >5 minutes
- Payment processing completely down
- Database completely inaccessible

#### High (P1) - Urgent Response Required
**Response Time**: 1 hour
**Escalation**: Slack + Email

**Triggers**:
- P95 response time >5 seconds for >10 minutes
- Error rate >2% for >15 minutes
- External service degraded performance
- Unusual traffic patterns (potential attack)

#### Medium (P2) - Important but Not Urgent
**Response Time**: 4 hours
**Escalation**: Email during business hours

**Triggers**:
- P95 response time >3 seconds for >30 minutes
- Cache hit rate <80% for >1 hour
- Function memory usage >80% consistently
- Database connection pool >70% utilized

#### Low (P3) - Informational
**Response Time**: Next business day
**Escalation**: Dashboard notification

**Triggers**:
- Weekly performance summary
- Security scan results
- Dependency update notifications
- Usage trend reports

### Alert Configuration

#### Uptime Monitoring
```yaml
Health Check Alert:
  endpoint: https://your-domain.com/api/health
  interval: 30s
  timeout: 10s
  failure_threshold: 3
  recovery_threshold: 2
  locations: ["US", "EU", "Asia"]
  
Main Site Alert:
  endpoint: https://your-domain.com
  interval: 60s
  timeout: 15s
  failure_threshold: 2
  recovery_threshold: 1
```

#### Performance Monitoring
```yaml
Response Time Alert:
  metric: p95_response_time
  threshold: 3000ms
  duration: 10m
  severity: high
  
Error Rate Alert:
  metric: error_rate_5xx
  threshold: 1%
  duration: 5m
  severity: critical
  
Memory Usage Alert:
  metric: function_memory_usage
  threshold: 80%
  duration: 15m
  severity: medium
```

## Dashboard Configuration

### Executive Dashboard
**Audience**: Management and stakeholders
**Update Frequency**: Real-time

**Metrics Displayed**:
- Overall system health status
- Active users count
- Revenue metrics (payment volume)
- Error rate trends
- Uptime percentage

### Operations Dashboard
**Audience**: Engineering and DevOps teams
**Update Frequency**: Real-time

**Metrics Displayed**:
- Detailed health check status
- Response time percentiles
- Error rate breakdown by endpoint
- Function execution metrics
- Database performance metrics
- External service status

### Security Dashboard
**Audience**: Security team and engineers
**Update Frequency**: Real-time

**Metrics Displayed**:
- Failed authentication attempts
- Rate limiting violations
- Unusual traffic patterns
- Security alerts
- Vulnerability scan results

## External Service Monitoring

### Database (PostgreSQL)
**Key Metrics**:
- Connection count and pool utilization
- Query execution time
- Lock contention
- Storage usage
- Backup status

**Alerts**:
- Connection pool >80% utilized
- Slow queries >10 seconds
- Storage >85% full
- Backup failures

### Cache (Redis)
**Key Metrics**:
- Memory usage
- Cache hit ratio
- Connection count
- Command execution time

**Alerts**:
- Memory usage >80%
- Hit ratio <70%
- Connection failures
- High latency >100ms

### Payment Processing (Stripe)
**Key Metrics**:
- Payment success rate
- Webhook delivery success
- API response times
- Account balance

**Alerts**:
- Payment success rate <95%
- Webhook failures >5%
- API response time >2 seconds
- Account balance alerts

### Authentication (Clerk)
**Key Metrics**:
- Authentication success rate
- API response times
- User session metrics
- Webhook delivery

**Alerts**:
- Auth success rate <98%
- API response time >3 seconds
- Webhook delivery failures

### Real-time Messaging (Pusher)
**Key Metrics**:
- Connection success rate
- Message delivery rate
- API response times
- Bandwidth usage

**Alerts**:
- Connection success rate <95%
- Message delivery rate <98%
- API response time >2 seconds
- Bandwidth usage >80% of limit

## Log Management

### Centralized Logging
**Platform**: Vercel Function Logs + External aggregation
**Retention**: 30 days for application logs, 90 days for security logs

### Log Categories

#### Application Logs
- **Level**: INFO, WARN, ERROR
- **Format**: Structured JSON
- **Content**: Request/response logs, business logic events
- **Sampling**: 100% for errors, 10% for info in production

#### Security Logs
- **Level**: WARN, ERROR, CRITICAL
- **Format**: Structured JSON with security fields
- **Content**: Authentication events, authorization failures, suspicious activity
- **Sampling**: 100% retention

#### Performance Logs
- **Level**: INFO, WARN
- **Format**: Metrics-focused JSON
- **Content**: Response times, database query times, cache performance
- **Sampling**: Statistical sampling for high-volume metrics

### Log Analysis

#### Automated Analysis
- **Error Pattern Detection**: Identify recurring error patterns
- **Performance Regression**: Detect performance degradation trends
- **Security Analysis**: Identify potential security threats
- **Business Intelligence**: Extract business metrics from logs

#### Alert Triggers from Logs
```yaml
Error Spike Alert:
  pattern: "ERROR level logs"
  threshold: ">100 errors in 5 minutes"
  severity: high
  
Security Event Alert:
  pattern: "Failed authentication"
  threshold: ">50 failures from same IP in 10 minutes"
  severity: critical
  
Performance Degradation:
  pattern: "Slow query"
  threshold: ">20 slow queries in 5 minutes"
  severity: medium
```

## Monitoring Tools Setup

### Recommended Monitoring Stack

#### Primary Monitoring (Free/Low Cost)
1. **Vercel Analytics** (Built-in)
   - Function performance
   - Error tracking
   - Traffic analytics

2. **UptimeRobot** (Free tier available)
   - Uptime monitoring
   - Multi-location checks
   - SMS/Email alerts

3. **Better Uptime** (Alternative)
   - Advanced uptime monitoring
   - Status page integration
   - Escalation policies

#### Advanced Monitoring (Paid)
1. **DataDog** (Comprehensive APM)
   - Full-stack monitoring
   - Custom dashboards
   - Advanced alerting

2. **New Relic** (Alternative APM)
   - Application performance
   - Infrastructure monitoring
   - Error tracking

3. **Sentry** (Error Tracking)
   - Error aggregation
   - Performance monitoring
   - Release tracking

### Setup Instructions

#### Vercel Analytics Setup
```bash
# Already included in the application
# Enable in Vercel dashboard
# Configure alerts in Vercel dashboard
```

#### UptimeRobot Setup
1. Create account at uptimerobot.com
2. Add HTTP monitors for:
   - https://your-domain.com (main site)
   - https://your-domain.com/api/health
   - https://your-domain.com/api/ready
3. Configure alert contacts
4. Set check intervals (1-5 minutes)

#### Custom Metrics Implementation
```typescript
// Example custom metrics endpoint
// src/app/api/metrics/route.ts
export async function GET() {
  const metrics = {
    timestamp: new Date().toISOString(),
    activeUsers: await getActiveUserCount(),
    errorRate: await getErrorRate(),
    responseTime: await getAverageResponseTime(),
    paymentSuccessRate: await getPaymentSuccessRate()
  }
  
  return NextResponse.json(metrics)
}
```

## Maintenance and Review

### Regular Review Schedule
- **Daily**: Review critical alerts and performance trends
- **Weekly**: Analyze performance reports and adjust thresholds
- **Monthly**: Review alert effectiveness and update configurations
- **Quarterly**: Comprehensive monitoring strategy review

### Threshold Tuning
- **Performance Baselines**: Update based on usage patterns
- **Alert Fatigue Prevention**: Adjust thresholds to reduce false positives
- **Seasonal Adjustments**: Account for business cycles and traffic patterns

### Documentation Updates
- **Runbook Updates**: Keep incident response procedures current
- **Contact Information**: Maintain current escalation contacts
- **Tool Configuration**: Document all monitoring tool configurations

---

## Quick Reference

### Emergency Contacts
- **Primary On-Call**: [Phone/Slack]
- **Secondary On-Call**: [Phone/Slack]
- **DevOps Lead**: [Phone/Slack]

### Critical Dashboards
- **Health Status**: [Dashboard URL]
- **Performance**: [Dashboard URL]
- **Errors**: [Dashboard URL]

### Quick Commands
```bash
# Check health status
curl https://your-domain.com/api/health

# Check readiness
curl https://your-domain.com/api/ready

# View recent logs
vercel logs

# Check deployment status
vercel ls
```