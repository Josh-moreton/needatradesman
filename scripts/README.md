# Scripts Directory

This directory contains utility scripts for maintaining the application.

## Clerk Sync Verification

### `verify-clerk-sync.ts`

Verifies that Clerk and Prisma database are in sync. Detects and optionally fixes drift between the two systems.

**Usage:**
```bash
# Check for drift (read-only)
pnpm clerk:verify-sync

# or manually:
pnpm tsx scripts/verify-clerk-sync.ts

# Check and automatically fix drift
pnpm clerk:fix-sync

# or manually:
pnpm tsx scripts/verify-clerk-sync.ts --fix
```

**What it checks:**
- Users in Clerk but missing in Prisma
- Users in Prisma but missing in Clerk (orphaned)
- Email address mismatches between systems

**When to run:**
- Weekly as part of maintenance
- After Clerk webhook issues
- After database migrations
- When investigating sync issues

**Output:**
The script provides a detailed report including:
- Total users in each system
- List of missing users
- List of orphaned users
- Email mismatches
- Summary statistics

See [CLERK_SYNC_MECHANISM.md](../docs/CLERK_SYNC_MECHANISM.md) for full documentation.

## Other Scripts

### `sonar_to_github_issues.py`

Python script for importing SonarQube issues to GitHub. See script for details.
