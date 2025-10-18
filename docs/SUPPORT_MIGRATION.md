# Support Ticketing System - Database Migration

## Migration Required

This feature introduces new database tables for the support ticketing system. You need to run a Prisma migration to create these tables.

## Tables Added

1. **tickets** - Main ticket table
2. **ticket_messages** - Messages within tickets
3. **ticket_attachments** - File attachments (schema ready, not yet implemented)

## Enums Added

1. **TicketStatus** - OPEN, PENDING, RESOLVED, CLOSED
2. **TicketPriority** - LOW, NORMAL, HIGH, URGENT
3. **TicketRole** - CUSTOMER, TRADESPERSON

## Running the Migration

### Development

```bash
pnpm prisma migrate dev --name add-support-ticketing
```

This will:
- Create the migration SQL file
- Apply it to your development database
- Regenerate the Prisma client

### Production

```bash
pnpm prisma migrate deploy
```

This applies all pending migrations to the production database.

## Migration SQL (Reference)

The migration will create tables similar to:

```sql
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE "TicketRole" AS ENUM ('CUSTOMER', 'TRADESPERSON');

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "role" "TicketRole" NOT NULL,
    "category" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "subject" TEXT NOT NULL,
    "initialBody" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeId" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_attachments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "messageId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tickets_createdById_idx" ON "tickets"("createdById");
CREATE INDEX "tickets_status_idx" ON "tickets"("status");
CREATE INDEX "tickets_assigneeId_idx" ON "tickets"("assigneeId");
CREATE INDEX "tickets_createdAt_idx" ON "tickets"("createdAt");

CREATE INDEX "ticket_messages_ticketId_idx" ON "ticket_messages"("ticketId");
CREATE INDEX "ticket_messages_authorId_idx" ON "ticket_messages"("authorId");

CREATE INDEX "ticket_attachments_messageId_idx" ON "ticket_attachments"("messageId");

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticketId_fkey" 
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_messageId_fkey" 
    FOREIGN KEY ("messageId") REFERENCES "ticket_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Rollback

If you need to rollback this migration in development:

```bash
pnpm prisma migrate reset
```

**Warning**: This will delete all data. Use with caution!

## Verification

After migration, verify the tables exist:

```sql
-- List all tables
\dt

-- Check tickets table
\d tickets

-- Check indexes
\di tickets_*
```

## Environment Variables

Don't forget to set admin user IDs:

```bash
ADMIN_USER_IDS=user_xxxxxxxxxxxxx,user_yyyyyyyyyyyyy
```

Add this to your `.env` (development) and production environment variables.
