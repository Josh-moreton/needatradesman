# Database Migration Required

## Overview
This PR adds unique constraints to the `Job` model's payment intent fields to provide database-level protection against duplicate payments.

## Changes to Schema
Added `@unique` constraints to:
- `depositPaymentIntentId`
- `finalPaymentIntentId`

These constraints ensure that each Stripe payment intent can only be used once, providing an additional layer of protection against race conditions at the database level.

## Migration Steps

After merging this PR, you'll need to create and run a database migration:

```bash
# Create the migration
pnpm prisma migrate dev --name add_unique_constraints_to_payment_intents

# Or for production
pnpm prisma migrate deploy
```

## Important Notes

1. **Existing Data**: The migration will fail if there are duplicate payment intent IDs in the existing data. You should check for duplicates before running the migration:

```sql
-- Check for duplicate deposit payment intents
SELECT "depositPaymentIntentId", COUNT(*) 
FROM jobs 
WHERE "depositPaymentIntentId" IS NOT NULL 
GROUP BY "depositPaymentIntentId" 
HAVING COUNT(*) > 1;

-- Check for duplicate final payment intents
SELECT "finalPaymentIntentId", COUNT(*) 
FROM jobs 
WHERE "finalPaymentIntentId" IS NOT NULL 
GROUP BY "finalPaymentIntentId" 
HAVING COUNT(*) > 1;
```

2. **Clean Up Duplicates**: If duplicates are found, you'll need to clean them up before applying the migration. This should be done carefully, potentially keeping the most recent record and updating/removing others.

3. **Rollback Plan**: If needed, you can rollback the migration using:

```bash
pnpm prisma migrate resolve --rolled-back <migration_name>
```

## Benefits

These constraints provide:
- **Database-level enforcement** of payment uniqueness
- **Additional protection** beyond application-level transaction checks
- **Clear error messages** if duplicate payment attempts reach the database
- **Data integrity** guarantee that no payment intent is processed twice

## Testing

After migration, verify:
1. New deposits are created successfully
2. Duplicate payment attempts are blocked with clear error messages
3. Final payments work as expected
4. No performance degradation on job queries
