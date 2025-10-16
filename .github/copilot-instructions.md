# Copilot instructions for this repo

we use pnpm.

pnpm lint && pnpm type-check before committing.

This project is a Next.js 15 (App Router) marketplace connecting customers and tradespeople. It uses React 19, TypeScript, Prisma (PostgreSQL), Clerk auth, Redis (ioredis + rate-limiter-flexible), Pusher (chat/notifications), and Stripe (payments). Keep edits small, typed, and aligned with established patterns below.

## Architecture essentials
- App Router structure under `src/app` with server and client components. API routes live in `src/app/api/**/route.ts` (Edge- or Node-handlers returning `NextResponse`).
- Authentication via Clerk. Prefer server helpers: `auth()` from `@clerk/nextjs/server` in server code and the middleware in `src/middleware.ts` which guards routes and handles onboarding redirects.
- Data via Prisma. Client is exported from `src/lib/prisma.ts` with global caching to avoid hot-reload leaks. See schema in `prisma/schema.prisma` (Users, Jobs, Applications, Messages, QuoteTemplate/QuoteTemplateItem, enums).
- Realtime via Pusher. Server/client instances in `src/lib/pusher.ts`; use `getConversationChannel`/`getUserChannel` helpers for channel names.
- Caching/ratelimiting via Redis in `src/lib/redis.ts` with helpers to invalidate specific keys after writes.
- Payments via Stripe. Shared client in `src/lib/stripe.ts`. Main flows: checkout session `src/app/api/stripe/checkout-session/route.ts` and webhook `src/app/api/stripe/webhook/route.ts`; Connect onboarding/status under `src/app/api/stripe/connect/**`.

## Conventions and patterns
- Server data access: use Prisma inside server routes/components. Validate auth early with `auth()`; map Clerk `userId` to internal `User` via `prisma.user.findUnique({ where: { clerkId: userId } })`.
- Zod validation: input shapes live in `src/lib/schemas.ts`. Reuse `quoteItemSchema` etc. Dont re-validate on the server if an API already validates, but validate external inputs.
- UI components: shadcn-style components in `src/components/ui/**`. Prefer composing these (Form, Input, Button, Select, Checkbox, Card...).
- Client components: mark with `"use client"` and keep them thin; call project APIs under `/api/**` and handle optimistic UI when safe. Use `sonner` for toasts; Toaster is mounted in `src/app/layout.tsx`.
- Role/Onboarding: role is stored on our `User` model (enum). Route-level role gating is usually done in page components, not middleware.
- Quote templates: CRUD API at `src/app/api/quote-templates/**`. Frontend integration via `src/components/quotes/QuoteBuilder.tsx` and `TemplateModal.tsx`.

## Key workflows (commands)
- Dev: `pnpm install` then `pnpm dev` (TurboPack). App at http://localhost:3000.
- Build: `pnpm build` (runs `prisma generate --no-engine` then `next build`). Start with `pnpm start`.
- Lint: `pnpm lint`.

Migrations
- Edit `prisma/schema.prisma`, then run Prisma Migrate (outside this file; typical: `pnpm prisma migrate dev -n "change"`). Ensure DB env is set.

## API design examples
- Pattern: early auth + user mapping + include relations + clear errors

  File: `src/app/api/quote-templates/route.ts`
  - GET: list templates for the authed user, include items
  - POST: validate body (`name`, `items[]` with `quoteItemSchema`), create `QuoteTemplate` with nested items (map `unitPrice` -> `price`)

  File: `src/app/api/quote-templates/[id]/route.ts`
  - DELETE/PATCH/GET: fetch by id, verify ownership (`template.userId === user.id`), then mutate. Items cascade on delete.

- Stripe checkout (deposit): `src/app/api/stripe/checkout-session/route.ts`
  - Validates requesting customer owns the job, pulls the accepted application, builds a one-line item session with deposit amount and computed percentage. Stores `jobId`, `tradespersonId`, and `applicationId` in `metadata`.

## Data model (selected)
- User: `role` (CUSTOMER|TRADESPERSON), `clerkId`, optional `stripeAccountId`, relations to jobs, applications, messages, quoteTemplates.
- Job: title, description, category, budget (Decimal), status, attachments (JSON string), customerId, acceptedTradespersonId, payment flags, timestamps.
- Application: message, optional quote (Decimal) or `quoteItems` (Json), `requiresDeposit`, `depositPercentage`, status, jobId, tradespersonId.
- QuoteTemplate/Item: per-user named template; items store description and Decimal `price`.

## Cross-cutting
- Redis cache keys and TTLs are defined in `src/lib/redis.ts`. After mutating jobs/applications, call the relevant invalidators (e.g., `invalidateJobCaches`, `invalidateApplicationCaches`).
- Pusher channels: conversation channel is `conversation-${jobId}-${sortedParticipantIds}`. Use server pusher to trigger and client pusher to subscribe.
- Middleware (`src/middleware.ts`) logs and redirects to onboarding if `onboardingComplete` isnt present in Clerk claims; API routes are excluded from onboarding checks.

## When adding features
- Place API under `src/app/api/<feature>/route.ts` or nested `[id]` routes.
- Always resolve Clerk `userId` -> our `User` and check role/ownership before DB writes.
- Prefer Zod schemas in `src/lib/schemas.ts` and reuse existing patterns.
- For money: store decimals with Prisma Decimal in DB; convert to Number safely before UI/Stripe. Always multiply by 100 for Stripe `unit_amount`.
- Keep UI accessible and consistent with shadcn components; mount toasts via `sonner`.

## Useful references
- Prisma schema: `prisma/schema.prisma`
- Auth helpers: `src/lib/auth.ts`
- Stripe helpers: `src/lib/stripe.ts`
- Redis helpers: `src/lib/redis.ts`
- Pusher: `src/lib/pusher.ts`
- Quote UI: `src/components/quotes/*`

If something is unclear (e.g., payment edge cases, onboarding flow), leave a short comment in code and ask in the PR description. Keep changes scoped and runnable with the scripts above.
