# Tradesperson Verification System

A comprehensive UK-specific qualification-led verification system that ensures tradespeople are qualified and legally compliant to perform the work they bid on.

## Overview

This system implements:
- **Hard-gating** of regulated work (Gas Safe, Electrical Part P, etc.)
- **Identity & business verification** via Stripe Connect
- **Insurance requirements** for all trades (Public Liability mandatory, Employer's Liability if employing staff)
- **Expiry-aware badges** with automatic reverification reminders
- **Region-aware rules** (Scotland vs England & Wales differences)
- **Comprehensive audit trail** for all verification actions

## Core Concepts

### Verification Types

The system supports multiple verification types categorized as:

1. **Identity & Business**
   - `IDENTITY` - Stripe Identity verification
   - `BUSINESS` - Business verification
   - `COMPANIES_HOUSE` - Companies House registration
   - `VAT` - VAT registration

2. **Insurance** (Mandatory for all)
   - `INSURANCE_PUBLIC` - Public Liability (required for all trades)
   - `INSURANCE_EMPLOYERS` - Employer's Liability (required if employing staff)

3. **Trade-Specific Licenses** (Regulated Work)
   - `GAS_SAFE` - Gas Safe registration (gas work)
   - `ELECTRICAL_CPS_EW` - Competent Person Scheme for England & Wales
   - `ELECTRICAL_APPROVED_SCOT` - Approved Certifier for Scotland
   - `OFTEC` - Oil Firing Technical Association (oil heating)
   - `HETAS` - Heating Equipment Testing and Approval Scheme (solid fuel)
   - `MCS` - Microgeneration Certification Scheme (heat pumps, solar)
   - `FGAS_COMPANY` - F-Gas company certification (refrigerants)

4. **Optional Qualifications & Memberships**
   - `CSCS` - Construction Skills Certification Scheme
   - `ECS` - Electrotechnical Certification Scheme
   - `WATERSAFE` - WaterSafe plumber
   - `CITY_GUILDS` - City & Guilds qualifications
   - `NVQ_SVQ` - NVQ/SVQ qualifications
   - `FMB` - Federation of Master Builders
   - `DBS_BASIC` - Basic DBS check (England & Wales)
   - `DISCLOSURE_SCOT` - Basic Disclosure Scotland

### Trade Categories

Jobs are tagged with specific trade categories that map to required verifications:

- `GAS` - Gas work (requires Gas Safe)
- `ELECTRICAL_NOTIFIABLE_EW` - Notifiable electrical work in England & Wales (requires CPS)
- `ELECTRICAL_SCOT_WARRANT` - Electrical work requiring building warrant in Scotland
- `OIL` - Oil heating (requires OFTEC)
- `SOLID_FUEL` - Solid fuel/biomass/stoves (requires HETAS)
- `HEAT_PUMP_SOLAR` - Heat pumps and solar installations (MCS optional but recommended)
- `AC_REFRIGERANT` - Air conditioning/refrigeration (requires F-Gas company cert)
- `PLUMBING` - General plumbing (insurance only)
- `JOINERY` - Joinery work (insurance only)
- `TILING` - Tiling work (insurance only)
- `DECORATING` - Decorating work (insurance only)
- `GENERAL_BUILDER` - General building work (insurance only)

### Regions

The system is region-aware with different rules for:
- `ENG_WLS` - England & Wales
- `SCT` - Scotland
- `NI` - Northern Ireland

## Database Schema

### Models

- **TradeProfile** - Business details for tradespeople (legal entity type, company number, VAT number, etc.)
- **Verification** - Individual verification records with status, expiry, and evidence
- **VerificationEvidence** - Uploaded documents and files for verifications
- **Badge** - Public badges displayed on tradesperson profiles
- **JobVisibilityRule** - Maps trade categories to required verifications by region
- **AuditLog** - Complete audit trail of all verification actions

### Verification Status Lifecycle

```
PENDING → User submits verification
    ↓
ACTIVE → Ops team approves (with expiry date)
    ↓
EXPIRED → Automatic expiry check (nightly cron)
```

Or:
```
PENDING → User submits verification
    ↓
REJECTED → Ops team rejects with reason
```

## API Endpoints

### For Tradespeople

#### Submit Verification
```
POST /api/verification/submit
```

Submit a new verification with evidence.

**Body:**
```json
{
  "type": "GAS_SAFE",
  "schemeName": "Gas Safe Register",
  "registrationNo": "123456",
  "level": "MANDATORY",
  "validFrom": "2024-01-01T00:00:00Z",
  "validTo": "2025-12-31T23:59:59Z",
  "fields": {
    "engineerId": "123456",
    "businessId": "987654"
  },
  "evidences": [
    {
      "kind": "DOCUMENT",
      "url": "https://storage.example.com/gas-safe-cert.pdf",
      "meta": { "filename": "gas-safe-certificate.pdf" }
    }
  ]
}
```

#### Get Verification Status
```
GET /api/verification/status
```

Returns all verifications for the current user with expiry status.

**Response:**
```json
{
  "hasProfile": true,
  "tradeProfile": { ... },
  "verifications": [
    {
      "id": "...",
      "type": "GAS_SAFE",
      "status": "ACTIVE",
      "validTo": "2025-12-31T23:59:59Z",
      "isExpired": false,
      "isExpiringSoon": true,
      "daysUntilExpiry": 25,
      ...
    }
  ],
  "badges": [ ... ],
  "summary": {
    "total": 5,
    "pending": 1,
    "active": 3,
    "expired": 0,
    "rejected": 1,
    "expiringSoon": 1
  }
}
```

#### Get Eligible Jobs
```
GET /api/jobs/eligible?status=OPEN&limit=50&offset=0
```

Returns only jobs the tradesperson is qualified to quote on.

#### Check Job Eligibility
```
GET /api/jobs/[jobId]/eligibility
```

Check if the tradesperson is eligible for a specific job.

**Response:**
```json
{
  "eligible": false,
  "missing": ["GAS_SAFE", "INSURANCE_PUBLIC"],
  "reason": "Missing required verifications: GAS_SAFE, INSURANCE_PUBLIC"
}
```

### For Operations/Admin (ROLE_VERIFIER)

#### Review Verification
```
POST /api/verification/review/[id]
```

Approve or reject a verification submission.

**Body:**
```json
{
  "status": "ACTIVE",
  "publicUrl": "https://register.gassaferegister.co.uk/engineer/123456",
  "validFrom": "2024-01-01T00:00:00Z",
  "validTo": "2025-12-31T23:59:59Z",
  "notes": "Verified against Gas Safe Register"
}
```

### Cron Jobs

#### Verification Expiry Sweeper
```
GET /api/cron/verification-expiry
```

Nightly job that:
- Marks expired verifications as `EXPIRED`
- Removes expired badges
- Creates audit log entries
- Sends notifications for expiring credentials (30/14/7 days)

**Authentication:** Bearer token via `CRON_SECRET` environment variable

## Verification Matrix

The system uses a JSON configuration file (`src/lib/verification-matrix.json`) to define which verifications are required for each trade category by region.

Example:
```json
{
  "GAS": {
    "ENG_WLS": {
      "required": ["GAS_SAFE", "INSURANCE_PUBLIC"],
      "optional": ["DBS_BASIC", "WATERSAFE"]
    },
    "SCT": {
      "required": ["GAS_SAFE", "INSURANCE_PUBLIC"],
      "optional": ["DISCLOSURE_SCOT", "WATERSAFE"]
    }
  }
}
```

## Job Gating Logic

### How It Works

1. **Job Creation**: Jobs can be tagged with specific `tradeCategories` and a `region`
2. **Verification Check**: When a tradesperson views jobs, the system checks their active verifications
3. **Filtering**: Only jobs they're qualified for are shown
4. **Application Blocking**: Attempts to apply to ineligible jobs are rejected

### Implementation

The core eligibility check is in `src/lib/verification.ts`:

```typescript
import { isEligibleToViewOrQuote, resolveRequiredVerifications } from '@/lib/verification'

// Get required verifications for job
const requirements = resolveRequiredVerifications(
  job.tradeCategories,
  job.region
)

// Check if user has all required active verifications
const eligible = isEligibleToViewOrQuote(
  userActiveVerifications,
  requirements.required
)
```

## Expiry Management

### Automatic Expiry Detection

A nightly cron job (`/api/cron/verification-expiry`) runs to:
1. Find all `ACTIVE` verifications with `validTo` dates
2. Mark those past `validTo` as `EXPIRED`
3. Remove associated badges from profiles
4. Create audit log entries
5. Send notifications to affected users

### Expiry Notifications

The system sends notifications at:
- **30 days** before expiry (reminder)
- **14 days** before expiry (warning)
- **7 days** before expiry (urgent)
- **On expiry** (paused notice)

### Re-verification Flow

When a verification expires:
1. Status changes to `EXPIRED`
2. Badges are removed from profile
3. User can no longer quote on gated jobs
4. User submits new verification with updated evidence
5. Ops reviews and approves
6. Status returns to `ACTIVE` and gating is lifted

## Security & Privacy

### Data Protection

- **Minimal Storage**: Only scheme numbers and essential metadata stored; full certificates in private S3
- **Access Control**: Only users with `ROLE_VERIFIER` in Clerk can review verifications
- **Audit Trail**: Every verification action is logged with actor, timestamp, and details
- **Retention**: Evidence files kept until expiry + 12 months, then purged

### Authentication

- **User Auth**: Clerk JWT tokens for all endpoints
- **Cron Auth**: Bearer token via `CRON_SECRET` environment variable
- **Ops Auth**: Clerk `publicMetadata.role === 'ROLE_VERIFIER'` check

## Setup & Configuration

### Environment Variables

```bash
# Required for cron authentication
CRON_SECRET=your-secret-token-here

# Existing variables for Stripe, Clerk, etc.
DATABASE_URL=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
```

### Database Migration

```bash
# Generate Prisma client
pnpm prisma generate

# Run pending migrations (when created)
pnpm prisma migrate deploy

# Seed job visibility rules
pnpm tsx prisma/seed-visibility-rules.ts
```

### Vercel Cron Setup

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/verification-expiry",
      "schedule": "0 1 * * *"
    }
  ]
}
```

## Usage Examples

### Adding Verification to Onboarding

In your tradesperson onboarding flow:

```typescript
// 1. Create trade profile
await prisma.tradeProfile.create({
  data: {
    userId: user.id,
    legalEntityType: 'SOLE_TRADER',
  }
})

// 2. Submit insurance verification
await fetch('/api/verification/submit', {
  method: 'POST',
  body: JSON.stringify({
    type: 'INSURANCE_PUBLIC',
    schemeName: 'ABC Insurance',
    fields: {
      insurer: 'ABC Insurance Ltd',
      policyNumber: 'POL123456',
      coverLimit: 2000000
    },
    validTo: '2025-12-31T23:59:59Z',
    evidences: [{ kind: 'DOCUMENT', url: insuranceCertUrl }]
  })
})
```

### Checking Eligibility Before Showing Job Details

```typescript
const eligibility = await fetch(`/api/jobs/${jobId}/eligibility`)
const { eligible, missing } = await eligibility.json()

if (!eligible) {
  return (
    <Alert>
      You need the following verifications to quote on this job:
      {missing.map(type => <Badge>{type}</Badge>)}
    </Alert>
  )
}
```

### Displaying Badges on Profile

```typescript
const { badges } = await fetch('/api/verification/status').then(r => r.json())

return (
  <div className="badges">
    {badges.map(badge => (
      <Badge key={badge.id}>
        {badge.name}: {badge.value}
        {badge.expiresAt && ` (expires ${formatDate(badge.expiresAt)})`}
      </Badge>
    ))}
  </div>
)
```

## Testing

### Unit Tests (TODO)

- Verification matrix parsing
- Eligibility checking logic
- Expiry detection functions

### Integration Tests (TODO)

- Submit verification flow
- Review and approval flow
- Expiry sweeper job
- Job filtering by eligibility

### E2E Tests (TODO)

- Complete onboarding with verifications
- Job visibility based on qualifications
- Application blocking for ineligible jobs

## Roadmap

### MVP (Current)
- ✅ Database schema and models
- ✅ Core API endpoints
- ✅ Verification matrix and gating logic
- ✅ Expiry management cron job
- ⏳ UI components (in progress)

### Phase 2 (Automation)
- [ ] Companies House API integration
- [ ] VAT validation API
- [ ] Open Banking account verification
- [ ] Automated insurance policy OCR
- [ ] Gas Safe Register API (if available)
- [ ] NICEIC/NAPIT API integrations

### Phase 3 (Enhancement)
- [ ] Risk scoring system
- [ ] Deposit requirement based on verification level
- [ ] Search ranking boost for verified pros
- [ ] Customer-visible "verified" trust signals
- [ ] Advanced analytics dashboard

## Support

For issues or questions about the verification system, contact the platform team or refer to the main project documentation.
