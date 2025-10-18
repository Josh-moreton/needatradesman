# Logging Guide

This document describes the logging system implemented in the Need A Tradesman application.

## Overview

The application uses a **simplified console-based logger** that leverages Vercel's built-in logging infrastructure. This approach was chosen for:
- **Vercel Integration**: Logs are automatically captured and aggregated in the Vercel Dashboard
- **Turbopack Compatibility**: No worker thread issues with Next.js Turbopack mode
- **Simplicity**: Minimal code, no external dependencies
- **Zero Configuration**: Works out of the box with Vercel's observability platform
- **Standard Pattern**: Follows Next.js best practices for serverless environments

### Why We Moved Away from Pino

Previously, we used Pino for logging, but encountered issues:
- ⚠️ **Turbopack incompatibility** - Pretty-printing disabled due to worker thread issues
- ⚠️ **Overkill** - Complex setup for our marketplace needs
- ⚠️ **Non-standard for Next.js** - Vercel has built-in logging that works better

## Architecture

### Logger Configuration

The logger is configured in `src/lib/logger.ts` as a thin wrapper around `console`:

**All Environments:**
- Structured output with timestamps and context
- Debug level only active in development
- JSON-formatted metadata for easy parsing
- Vercel automatically captures console.log/warn/error/debug

### Data Security

The simplified logger doesn't log sensitive data by design:
- Never log passwords, tokens, credit cards, or PII
- API keys and secrets should be in environment variables
- Clerk IDs and user emails should be used sparingly
- Use user IDs instead of personal information when possible

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

**Note:** Debug logs only appear in development (NODE_ENV !== 'production')

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

// ✅ Also correct: Message only
logger.info('Server started on port 3000');

// ✅ Also correct: Object only
logger.error({ error, code: 'ECONNREFUSED' });
```

The logger handles all three patterns seamlessly.

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

The logger respects `NODE_ENV`:
- **Development** (`NODE_ENV !== 'production'`): All log levels including debug
- **Production** (`NODE_ENV === 'production'`): Info, warn, and error only (debug is suppressed)

## Viewing Logs

### Development
Logs appear in your terminal when running `pnpm dev`

### Production (Vercel)

**Vercel Dashboard:**
1. Go to your project in Vercel Dashboard
2. Click "Logs" tab
3. Filter by function, date, or search text
4. Search for specific contexts like `[stripe-webhook]`

**Vercel CLI:**
```bash
# View recent logs
vercel logs

# Follow logs in real-time
vercel logs --follow

# Filter by function
vercel logs --output=function-name

# View logs for specific deployment
vercel logs <deployment-url>
```

## Production Integration

### Vercel Log Drains (Optional)

For advanced logging needs, configure Log Drain to forward logs to a monitoring service:

1. Go to Vercel Project Settings → Integrations → Log Drains
2. Add a drain for your preferred service:
   - **Datadog**: Real-time monitoring and alerting
   - **Logflare**: Fast log search and analytics
   - **Axiom**: Serverless-native observability
   - **Better Stack**: Modern logging and error tracking

3. Configure the drain URL and authentication

Logs will automatically be forwarded with full context.

### Log Analysis

With the structured format, you can:
- Filter by context: Search for `[stripe-webhook]`
- Search by user: Search for `userId`
- Track errors: Filter by `[ERROR]`
- Monitor specific operations: Search for specific messages

### Alerting

Set up alerts in your log aggregation service:
```typescript
// Critical errors will be visible in monitoring
logger.error({ error, severity: 'critical' }, 'Payment gateway down');
```

## Migration Notes

### From Pino to Console-Based Logger

The codebase has been migrated from Pino to a simplified console-based logger. The API remains the same, so existing code works without changes:

**Before (Pino):**
```typescript
import { createLogger } from '@/lib/logger';
const logger = createLogger('jobs-api');

logger.info({ userId }, 'User created');
logger.error({ error }, 'Failed to create user');
```

**After (Console-based):**
```typescript
import { createLogger } from '@/lib/logger';
const logger = createLogger('jobs-api');

logger.info({ userId }, 'User created');  // Same API!
logger.error({ error }, 'Failed to create user');  // Same API!
```

No code changes needed - the simplified logger maintains API compatibility!

### Benefits of the Migration

- ✅ **Turbopack Compatible**: No worker thread issues
- ✅ **Less Code**: ~60 lines instead of ~50 lines + 2 dependencies
- ✅ **Zero Dependencies**: Removed `pino` and `pino-pretty`
- ✅ **Better Vercel Integration**: Native console logging works seamlessly
- ✅ **Same API**: No breaking changes to existing code

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

1. Check that you're running `pnpm dev`
2. Verify logs are being called correctly: `logger.info('Test message')`
3. Check browser console for client-side logs

### Debug logs not appearing

Debug logs are only shown in development. Ensure `NODE_ENV !== 'production'`.

### Logs not in Vercel Dashboard

1. Verify deployment is successful
2. Check the "Logs" tab in Vercel Dashboard
3. Ensure you're looking at the correct project and deployment
4. Try the Vercel CLI: `vercel logs`

## Implementation Details

The logger is implemented in `src/lib/logger.ts` as a thin wrapper around console methods. It:
- Adds timestamps in ISO 8601 format
- Includes context in every log entry
- Formats metadata as JSON
- Suppresses debug logs in production
- Maintains Pino-compatible API for backward compatibility

Example output:
```
[2025-10-17T17:12:26.115Z] [jobs-api] [INFO] Job created successfully {"jobId":"456","userId":"user-789"}
[2025-10-17T17:12:26.115Z] [stripe-webhook] [ERROR] Payment failed {"error":{...},"paymentId":"pi_123"}
```

## Resources

- [Vercel Runtime Logs Documentation](https://vercel.com/docs/observability/runtime-logs)
- [Next.js Logging Best Practices](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)
- [Vercel Log Drains](https://vercel.com/docs/observability/log-drains)
