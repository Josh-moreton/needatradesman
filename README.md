# Need A Tradesman.

Need A Tradesman is a marketplace for homeowners to connect with vetted tradespeople. Customers can post jobs and manage responses while tradespeople browse open jobs and send quotes. Real‑time messaging and notifications keep both sides in sync.

## Tech Stack

- **Next.js 15 / React 19** – App Router with server and client components
- **TypeScript** – full type safety across the codebase
- **Tailwind CSS & shadcn/ui** – utility‑first styling and accessible UI components
- **Prisma** – ORM for a PostgreSQL database
- **Clerk** – authentication and user management
- **Redis** – caching, rate limiting and foundation for real‑time features
- **Pusher** – real‑time chat and notifications
- **Stripe** – planned escrow and payout system
- **ESLint** – linting with strict configuration

## Features

- Role‑based access for customers and tradespeople
- Customer flow:
  - Post new jobs and manage your listings
  - View applications and start chats with tradespeople
- Tradesperson flow:
  - Browse jobs filtered by trade and location
  - Submit applications and quotes
  - Dashboard with quick stats and recent activity
- Messaging system with live updates via Pusher and Redis
- Comprehensive caching and rate limiting through Redis
- Planned payment workflow using Stripe Connect

## Development

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file and provide the following keys:

- `DATABASE_URL` – PostgreSQL connection string
- `CLERK_SECRET_KEY` and `CLERK_PUBLISHABLE_KEY`
- `REDIS_URL` – Redis instance for caching and rate limiting
- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`
- `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `LOG_LEVEL` (optional) – logging level: `debug`, `info`, `warn`, `error` (defaults to `debug` in dev, `info` in prod)
- `NEXT_PUBLIC_ALLOWED_ATTACHMENT_DOMAINS` (optional) – comma-separated list of allowed domains for job attachments (e.g., `mybucket.s3.amazonaws.com,mycdn.cloudfront.net`). Defaults to common cloud storage providers if not set.

See `.env.example` for a complete template.

## Scripts

- `pnpm dev` – run a development server with TurboPack
- `pnpm build` – generate Prisma client and build Next.js
- `pnpm start` – start the production build
- `pnpm lint` – run ESLint across the project
- `pnpm type-check` – run TypeScript type checking

## Security

### Attachment Validation

Job attachments are validated to prevent XSS attacks and unauthorized file access:

- **Domain Whitelisting**: Only URLs from approved domains are accepted (configurable via `NEXT_PUBLIC_ALLOWED_ATTACHMENT_DOMAINS`)
- **File Size Limits**: Maximum 10MB per attachment
- **Filename Validation**: Filenames must be 1-255 characters
- **Maximum Attachments**: Up to 5 attachments per job

Default allowed domains include common cloud storage providers (S3, CloudFront, R2, Google Cloud Storage). Configure your own domains in the environment variables to match your file upload infrastructure.

## Logging

The application uses [Pino](https://getpino.io/) for structured logging with the following features:

- **Environment-aware**: Pretty-printed, colorized logs in development; JSON logs in production
- **Context-specific loggers**: Each module creates its own logger with context
- **Sensitive data redaction**: Automatically redacts passwords, tokens, emails, and other sensitive fields in production
- **Log levels**: `debug` (dev only), `info`, `warn`, `error`

### Usage

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('my-module');

logger.info({ userId, jobId }, 'Job created successfully');
logger.error({ error }, 'Failed to process payment');
logger.debug({ data }, 'Debug information');
```

### Configuration

Set the `LOG_LEVEL` environment variable to control logging verbosity:
- `debug` – All logs including debug information (default in development)
- `info` – General information and above (default in production)
- `warn` – Warnings and errors only
- `error` – Errors only

### Production Integration

For production monitoring, Pino's JSON output can be integrated with log aggregation services like:
- Vercel Log Drain (Datadog, Better Stack, Logflare, Axiom)
- Direct integration with any service that accepts JSON logs

## License

This project is provided as‑is for demonstration purposes.
