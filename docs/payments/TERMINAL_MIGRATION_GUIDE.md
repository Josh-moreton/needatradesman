# Stripe Terminal Database Migration Guide

## Overview

This guide covers the database migration required to add Stripe Terminal (handheld card reader) support to the Need A Tradesman platform.

## Database Changes

### Schema Changes

#### User Model
Added three new optional fields for Terminal support:

```prisma
model User {
  // ... existing fields ...
  
  // Stripe Terminal fields for tradespeople
  stripeTerminalLocationId String? // Terminal location for card readers
  terminalReaderId         String? // Associated card reader ID
  terminalReaderLabel      String? // Custom label for reader (e.g., "John's Reader")
}
```

#### Job Model
Added two new optional fields for tracking Terminal payments:

```prisma
model Job {
  // ... existing fields ...
  
  // Terminal payment fields
  finalPaymentMethod      PaymentMethod? // How final payment was made
  terminalPaymentIntentId String?        // Payment intent ID for Terminal payments
}
```

#### New Enum
Added enum to track payment methods:

```prisma
enum PaymentMethod {
  ONLINE   // Card payment through Stripe Checkout (web)
  TERMINAL // In-person card payment via Stripe Terminal reader
}
```

## Migration Steps

### Step 1: Create Migration File

Run the following command to create a new Prisma migration:

```bash
pnpm prisma migrate dev --name add_stripe_terminal_support
```

This will:
1. Generate SQL migration file in `prisma/migrations/`
2. Apply the migration to your development database
3. Regenerate Prisma Client with new types

### Step 2: Review Generated SQL

The migration should generate SQL similar to:

```sql
-- AlterTable User
ALTER TABLE "users" ADD COLUMN "stripeTerminalLocationId" TEXT,
                    ADD COLUMN "terminalReaderId" TEXT,
                    ADD COLUMN "terminalReaderLabel" TEXT;

-- CreateEnum PaymentMethod
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'TERMINAL');

-- AlterTable Job
ALTER TABLE "jobs" ADD COLUMN "finalPaymentMethod" "PaymentMethod",
                  ADD COLUMN "terminalPaymentIntentId" TEXT;
```

### Step 3: Apply to Production

When ready to deploy to production:

```bash
# Option 1: Using Prisma Migrate
pnpm prisma migrate deploy

# Option 2: Manual SQL (if needed)
# Run the SQL from step 2 directly on production database
```

## Rollback Plan

If you need to rollback the migration:

### Development Database

```bash
# Undo the last migration
pnpm prisma migrate reset

# Or manually remove the migration
rm -rf prisma/migrations/[timestamp]_add_stripe_terminal_support
pnpm prisma migrate dev
```

### Production Database

Run this SQL to revert changes:

```sql
-- Drop columns from Job
ALTER TABLE "jobs" DROP COLUMN IF EXISTS "finalPaymentMethod",
                  DROP COLUMN IF EXISTS "terminalPaymentIntentId";

-- Drop enum
DROP TYPE IF EXISTS "PaymentMethod";

-- Drop columns from User
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripeTerminalLocationId",
                   DROP COLUMN IF EXISTS "terminalReaderId",
                   DROP COLUMN IF EXISTS "terminalReaderLabel";
```

## Data Considerations

### Existing Data

**No data migration needed** - all new fields are optional:

- Existing users continue to work normally
- Existing jobs remain unaffected
- No default values required

### Future Data

After deployment:

- New users will have Terminal fields set to `null` initially
- Terminal fields are populated only when tradesperson sets up a card reader
- `finalPaymentMethod` defaults to `null`, set to `ONLINE` or `TERMINAL` when payment is made

## Validation

### After Migration

Run these queries to verify migration success:

```sql
-- Check User table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('stripeTerminalLocationId', 'terminalReaderId', 'terminalReaderLabel');

-- Check Job table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'jobs'
  AND column_name IN ('finalPaymentMethod', 'terminalPaymentIntentId');

-- Check PaymentMethod enum exists
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (
  SELECT oid FROM pg_type WHERE typname = 'PaymentMethod'
);

-- Expected output: ONLINE, TERMINAL
```

## Testing

### Verify Schema in Code

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test User fields
const user = await prisma.user.create({
  data: {
    clerkId: 'test_123',
    email: 'test@example.com',
    role: 'TRADESPERSON',
    stripeTerminalLocationId: 'tml_test123',
    terminalReaderId: 'tmr_test456',
    terminalReaderLabel: 'Test Reader',
  },
});

// Test Job fields
const job = await prisma.job.update({
  where: { id: 'some_job_id' },
  data: {
    finalPaymentMethod: 'TERMINAL',
    terminalPaymentIntentId: 'pi_test789',
  },
});
```

### API Testing

Test the new Terminal API endpoints:

```bash
# 1. Create Terminal location
curl -X POST http://localhost:3000/api/stripe/terminal/location \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test Location",
    "address": {
      "line1": "123 Test St",
      "city": "London",
      "postalCode": "SW1A 1AA"
    }
  }'

# 2. Check location status
curl http://localhost:3000/api/stripe/terminal/location

# 3. Register reader (requires valid registration code)
curl -X POST http://localhost:3000/api/stripe/terminal/reader \
  -H "Content-Type: application/json" \
  -d '{
    "registrationCode": "test-code",
    "label": "My Test Reader"
  }'
```

## Monitoring

### Post-Deployment Checks

Monitor these metrics after deployment:

1. **Migration Success Rate**
   - Check database logs for errors
   - Verify no constraint violations

2. **API Endpoints**
   - Monitor new Terminal endpoints for errors
   - Check response times

3. **User Impact**
   - No impact on existing users expected
   - Monitor support tickets for Terminal-related issues

4. **Performance**
   - New optional fields have minimal performance impact
   - No additional indexes needed initially

## Troubleshooting

### Issue: Migration Fails Due to Existing Data

**Symptom**: Migration fails with constraint violation

**Solution**: This shouldn't happen as all fields are optional. If it does:
```sql
-- Check for any data conflicts
SELECT id, stripeTerminalLocationId, terminalReaderId
FROM users
WHERE stripeTerminalLocationId IS NOT NULL
   OR terminalReaderId IS NOT NULL;
```

### Issue: Enum Creation Fails

**Symptom**: `PaymentMethod` enum already exists

**Solution**:
```sql
-- Check if enum exists
SELECT * FROM pg_type WHERE typname = 'PaymentMethod';

-- If exists, drop and recreate
DROP TYPE IF EXISTS "PaymentMethod";
CREATE TYPE "PaymentMethod" AS ENUM ('ONLINE', 'TERMINAL');
```

### Issue: Type Errors After Migration

**Symptom**: TypeScript errors referencing `PaymentMethod`

**Solution**:
```bash
# Regenerate Prisma Client
pnpm prisma generate

# Restart TypeScript server if using IDE
```

## Timeline

### Development Environment
- **Preparation**: 5 minutes (review this guide)
- **Migration**: 2 minutes (run migrate command)
- **Testing**: 10 minutes (verify schema and APIs)
- **Total**: ~20 minutes

### Production Environment
- **Preparation**: 15 minutes (backup database, review migration)
- **Migration**: 1-2 minutes (run migrate deploy)
- **Validation**: 10 minutes (run verification queries)
- **Monitoring**: 1 hour (watch for issues)
- **Total**: ~1.5 hours

## Backup & Recovery

### Before Migration

```bash
# PostgreSQL backup
pg_dump -U postgres -d needatradesman > backup_pre_terminal_$(date +%Y%m%d).sql

# Verify backup
pg_restore --list backup_pre_terminal_*.sql
```

### Restore If Needed

```bash
# Stop application
# Restore from backup
psql -U postgres -d needatradesman < backup_pre_terminal_*.sql

# Regenerate Prisma Client
pnpm prisma generate

# Restart application
```

## Checklist

### Pre-Migration
- [ ] Review schema changes
- [ ] Backup production database
- [ ] Test migration in development
- [ ] Verify all tests pass
- [ ] Schedule maintenance window (if needed)
- [ ] Notify team of deployment

### During Migration
- [ ] Run migration command
- [ ] Verify migration completed successfully
- [ ] Check database logs for errors
- [ ] Regenerate Prisma Client
- [ ] Run validation queries

### Post-Migration
- [ ] Test Terminal API endpoints
- [ ] Verify no impact on existing features
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Update team on completion
- [ ] Document any issues

## Support

### Migration Issues

If you encounter any issues during migration:

1. Check Prisma logs: `prisma/migrations/migration_lock.toml`
2. Review database logs
3. Consult Prisma documentation: https://www.prisma.io/docs/concepts/components/prisma-migrate
4. Contact engineering team via Slack

### Schema Questions

For questions about the new schema:

- Review `docs/payments/stripe-terminal-integration.md`
- Check Stripe Terminal docs: https://stripe.com/docs/terminal
- Review API endpoint implementations in `src/app/api/stripe/terminal/`

---

**Last Updated**: 2025-10-21  
**Migration Version**: 1.0  
**Author**: Engineering Team
