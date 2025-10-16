# Logging Guide

This document describes the logging system implemented in the Need A Tradesman application.

## Overview

The application uses [Pino](https://getpino.io/) for structured, high-performance logging. Pino was chosen for its:
- **Performance**: 7x faster than Winston, optimized for serverless/Vercel environments
- **Structured output**: JSON logs for easy parsing and aggregation
- **Low overhead**: Minimal impact on application performance
- **Serverless-friendly**: Optimized for cold starts and short-lived processes

## Architecture

### Logger Configuration

The logger is configured in `src/lib/logger.ts` with environment-aware settings:

**Development Mode:**
- Pretty-printed output with colors
- Debug level logging enabled
- Human-readable timestamps
- All log metadata displayed

**Production Mode:**
- JSON structured output
- Info level logging by default
- Sensitive data automatically redacted
- Machine-readable format for log aggregation

### Sensitive Data Redaction

In production, the following fields are automatically redacted from logs:
- `req.headers.authorization`
- `req.headers.cookie`
- `password`
- `email`
- `token`
- `apiKey`
- `secret`
- `stripeToken`
- `clerkId`

Additional fields can be added to the redaction list in `src/lib/logger.ts`.

## Usage

### Creating a Logger

Each module should create its own logger with a descriptive context:

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('stripe-webhook');
```

The context will be included in all log entries, making it easy to filter and search logs.

### Log Levels

Use appropriate log levels for different types of messages:

#### Debug
Use for detailed information useful during development:
```typescript
logger.debug({ params, query }, 'Processing request');
logger.debug({ cacheKey }, 'Cache hit');
```

#### Info
Use for general informational messages:
```typescript
logger.info({ userId, jobId }, 'Job created successfully');
logger.info({ eventType }, 'Webhook received');
```

#### Warn
Use for warning messages that don't prevent operation:
```typescript
logger.warn({ userId }, 'Rate limit approaching');
logger.warn('Missing optional configuration');
```

#### Error
Use for errors that need attention:
```typescript
logger.error({ error, jobId }, 'Payment processing failed');
logger.error({ error }, 'Database connection lost');
```

### Structured Logging

Always use the object-first format for structured logging:

```typescript
// ✅ Correct: Object with metadata first, message second
logger.info({ userId, jobId, amount }, 'Payment processed');

// ❌ Incorrect: Message first
logger.info('Payment processed', { userId, jobId, amount });
```

This ensures metadata is properly indexed and searchable in log aggregation systems.

### Best Practices

1. **Include context**: Always add relevant metadata to help debug issues
   ```typescript
   logger.error({ error, jobId, userId }, 'Failed to update job');
   ```

2. **Use descriptive messages**: Messages should be clear and actionable
   ```typescript
   // ✅ Good
   logger.error({ error }, 'Failed to connect to Stripe API');
   
   // ❌ Bad
   logger.error({ error }, 'Error');
   ```

3. **Avoid logging sensitive data**: Never log passwords, tokens, or PII
   ```typescript
   // ❌ Bad
   logger.debug({ password, creditCard }, 'User data');
   
   // ✅ Good
   logger.debug({ userId }, 'User authenticated');
   ```

4. **Use appropriate levels**: Don't use `error` for expected conditions
   ```typescript
   // ❌ Bad
   logger.error('User not found');
   
   // ✅ Good
   logger.warn({ userId }, 'User not found');
   ```

## Environment Variables

Control logging behavior with environment variables:

- `NODE_ENV`: Set to `production` for production logging mode
- `LOG_LEVEL`: Override default log level (`debug`, `info`, `warn`, `error`)

Example:
```bash
# Development
NODE_ENV=development LOG_LEVEL=debug pnpm dev

# Production
NODE_ENV=production LOG_LEVEL=info pnpm start
```

## Production Integration

### Vercel Log Drain

For production deployments on Vercel, configure Log Drain to forward logs to a monitoring service:

1. Go to Vercel Project Settings → Integrations → Log Drains
2. Add a drain for your preferred service:
   - **Datadog**: Real-time monitoring and alerting
   - **Better Stack**: Modern logging and error tracking
   - **Logflare**: Fast log search and analytics
   - **Axiom**: Serverless-native observability

3. Configure the drain URL and authentication

Logs will automatically be forwarded in JSON format.

### Log Analysis

With structured JSON logs, you can:
- Filter by context: `context:"stripe-webhook"`
- Search by user: `userId:"user123"`
- Track errors: `level:50`
- Monitor specific operations: `msg:"Payment processed"`

### Alerting

Set up alerts for critical conditions:
```typescript
// This will trigger alerts in production monitoring
logger.error({ error, severity: 'critical' }, 'Payment gateway down');
```

## Migration from console.log

The codebase has been fully migrated from `console.log` to Pino. If you need to add logging:

**Before:**
```typescript
console.log('User created:', userId);
console.error('Error:', error);
```

**After:**
```typescript
logger.info({ userId }, 'User created');
logger.error({ error }, 'Failed to create user');
```

## Examples

### API Route Logging
```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('jobs-api');

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    logger.debug({ data }, 'Received job creation request');
    
    const job = await createJob(data);
    logger.info({ jobId: job.id, userId: job.customerId }, 'Job created');
    
    return NextResponse.json(job);
  } catch (error) {
    logger.error({ error }, 'Failed to create job');
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Component Logging
```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('job-form');

export function JobForm() {
  const handleSubmit = async (data: FormData) => {
    try {
      logger.debug({ data }, 'Submitting job form');
      const response = await fetch('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create job');
      }
      
      logger.info('Job created successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to submit job form');
    }
  };
}
```

### Webhook Logging
```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('stripe-webhook');

export async function POST(request: Request) {
  const event = await verifyWebhook(request);
  
  logger.info({ eventType: event.type, eventId: event.id }, 'Webhook received');
  
  switch (event.type) {
    case 'payment_intent.succeeded':
      logger.info({ paymentIntentId: event.data.object.id }, 'Payment succeeded');
      break;
    
    case 'payment_intent.failed':
      logger.error({ 
        paymentIntentId: event.data.object.id,
        error: event.data.object.last_payment_error 
      }, 'Payment failed');
      break;
      
    default:
      logger.debug({ eventType: event.type }, 'Unhandled webhook event');
  }
}
```

## Troubleshooting

### Logs not appearing in development

1. Check that `NODE_ENV` is not set to `production`
2. Verify `LOG_LEVEL` is set to `debug` or not set at all
3. Ensure `pino-pretty` is installed: `pnpm install pino-pretty`

### Logs not in JSON format in production

1. Verify `NODE_ENV=production` is set
2. Check that `pino-pretty` transport is not enabled in production

### Sensitive data appearing in logs

1. Add the field to the redaction list in `src/lib/logger.ts`
2. Ensure you're running in production mode
3. Verify the field path is correct (use dot notation for nested fields)

## Resources

- [Pino Documentation](https://getpino.io/)
- [Pino Best Practices](https://getpino.io/#/docs/best-practices)
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains)
