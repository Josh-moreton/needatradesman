# Implementation Summary: Tradesperson Verification System

## What Has Been Implemented ✅

### 1. Database Schema (Complete)
- ✅ **New Models**:
  - `TradeProfile` - Business details for tradespeople
  - `Verification` - Individual verification records
  - `VerificationEvidence` - Uploaded documents/files
  - `Badge` - Public badges for profiles
  - `JobVisibilityRule` - Category → verification mapping
  - `AuditLog` - Complete audit trail

- ✅ **New Enums**:
  - `LegalEntityType` (SOLE_TRADER, PARTNERSHIP, LIMITED)
  - `VerificationType` (21 types: IDENTITY, GAS_SAFE, INSURANCE_PUBLIC, etc.)
  - `VerificationLevel` (MANDATORY, OPTIONAL)
  - `VerificationStatus` (PENDING, ACTIVE, EXPIRED, REJECTED)
  - `EvidenceKind` (DOCUMENT, IMAGE, SCREENSHOT, EMAIL, CONFIRMATION)
  - `Region` (ENG_WLS, SCT, NI)
  - `TradeCategory` (12 categories: GAS, ELECTRICAL_NOTIFIABLE_EW, etc.)

- ✅ **Schema Extensions**:
  - Added `tradeProfile` relation to User model
  - Added `tradeCategories[]` and `region` to Job model

### 2. Core API Endpoints (Complete)

#### Tradesperson Endpoints
- ✅ `POST /api/verification/submit` - Submit verification with evidence
- ✅ `GET /api/verification/status` - Get verification status summary
- ✅ `GET /api/jobs/eligible` - Filter jobs by eligibility
- ✅ `GET /api/jobs/[jobId]/eligibility` - Check specific job eligibility

#### Operations/Admin Endpoints
- ✅ `POST /api/verification/review/[id]` - Approve/reject verifications (ROLE_VERIFIER only)

#### Cron Jobs
- ✅ `GET /api/cron/verification-expiry` - Nightly expiry sweeper

### 3. Core Library & Logic (Complete)
- ✅ **Verification Matrix** (`src/lib/verification-matrix.json`)
  - Machine-readable configuration
  - Maps TradeCategory → required VerificationType by Region
  - Supports "ALL" regions for common rules

- ✅ **Verification Logic** (`src/lib/verification.ts`)
  - `resolveRequiredVerifications()` - Parse matrix for job
  - `isEligibleToViewOrQuote()` - Check user eligibility
  - `getMissingVerifications()` - Identify gaps
  - `isExpiringSoon()` - Check expiry status
  - `isExpired()` - Check if expired

- ✅ **Job Eligibility** (`src/lib/job-eligibility.ts`)
  - `checkJobEligibility()` - Eligibility for specific job
  - `getEligibleJobs()` - Filter jobs by qualifications

- ✅ **Zod Schemas** (`src/lib/schemas.ts`)
  - `submitVerificationSchema`
  - `reviewVerificationSchema`
  - `createTradeProfileSchema`
  - `verificationEvidenceSchema`

### 4. UI Components (Complete - Basic)
- ✅ `VerificationStatus` - Dashboard component showing:
  - Summary statistics
  - Alerts for expiring/expired
  - Detailed verification list with status
  
- ✅ `VerificationBadges` - Profile display component:
  - Compact badge display
  - Expiry indicators
  - Color-coded status

- ✅ `Alert` - UI component (shadcn-style)

### 5. Documentation (Complete)
- ✅ `docs/VERIFICATION_SYSTEM.md` - Comprehensive documentation:
  - System overview
  - API reference
  - Usage examples
  - Security considerations
  - Setup guide

- ✅ `prisma/seed-visibility-rules.ts` - Seed script for rules

### 6. Quality Assurance (Complete)
- ✅ TypeScript type-checking passing
- ✅ ESLint linting passing
- ✅ CodeQL security scan passing (0 alerts)
- ✅ Type-safe database operations
- ✅ Input validation via Zod

---

## What Still Needs to Be Done ⏳

### 1. Database Migration 🔴 HIGH PRIORITY
```bash
# Required before deployment
pnpm prisma migrate dev --name add_verification_system
pnpm tsx prisma/seed-visibility-rules.ts
```

**Note**: The schema is defined but no migration has been created yet. This is required before the system can be used.

### 2. Integration with Existing Endpoints 🟡 MEDIUM PRIORITY

#### Update Job Application Endpoint
File: `src/app/api/applications/route.ts`

Add eligibility check before allowing application:
```typescript
import { checkJobEligibility } from '@/lib/job-eligibility'

// Before creating application
const eligibility = await checkJobEligibility(user.id, jobId)
if (!eligibility.eligible) {
  return NextResponse.json({
    error: 'Not eligible for this job',
    missing: eligibility.missing
  }, { status: 403 })
}
```

#### Update Job Listing Endpoint
File: `src/app/api/jobs/route.ts` (GET handler)

Filter jobs based on tradesperson's qualifications:
```typescript
import { getEligibleJobs } from '@/lib/job-eligibility'

// For tradespeople, return only eligible jobs
if (user.role === 'TRADESPERSON') {
  const result = await getEligibleJobs(user.id, { status, category })
  return NextResponse.json({ jobs: result.jobs })
}
```

### 3. UI Integration 🟡 MEDIUM PRIORITY

#### Tradesperson Dashboard
Add `<VerificationStatus />` component to tradesperson dashboard page.

**Location**: `src/app/(protected)/dashboard/page.tsx` (or similar)

```tsx
import { VerificationStatus } from '@/components/verification'

export default function TradespersonDashboard() {
  return (
    <div>
      <VerificationStatus />
      {/* existing dashboard content */}
    </div>
  )
}
```

#### Tradesperson Profile
Add `<VerificationBadges />` to profile pages (both public and private views).

**Locations**:
- `src/app/(protected)/profile/page.tsx` (own profile)
- `src/app/tradesperson/[id]/page.tsx` (public profile)

```tsx
import { VerificationBadges } from '@/components/verification'

// Fetch badges from API or database
const badges = await fetchBadges(userId)

return <VerificationBadges badges={badges} />
```

#### Job Detail Page
Add eligibility indicator showing if user can apply:

```tsx
const eligibility = await fetch(`/api/jobs/${jobId}/eligibility`)
const { eligible, missing } = await eligibility.json()

if (!eligible) {
  return (
    <Alert variant="destructive">
      You need these verifications to apply:
      {missing.map(type => <Badge>{type}</Badge>)}
    </Alert>
  )
}
```

### 4. Additional UI Components 🟢 LOW PRIORITY (Future PR)

#### Evidence Upload Form
Component for uploading verification documents:
- File upload with progress
- Metadata input (scheme name, registration number, expiry)
- Preview before submission

#### Admin Review Queue
Dashboard for operations team:
- List of pending verifications
- Quick links to official registers
- Approve/reject with notes
- Bulk actions

#### Onboarding Integration
Integrate verification into tradesperson onboarding flow:
- Progressive disclosure (insurance first, then trade-specific)
- Guided evidence upload
- Status tracking

### 5. Notification System 🟡 MEDIUM PRIORITY

#### Email Notifications
Integrate with existing email system (`src/lib/email.ts`):

Templates needed:
- `VerificationApproved.tsx`
- `VerificationRejected.tsx`
- `VerificationExpiring30Days.tsx`
- `VerificationExpiring14Days.tsx`
- `VerificationExpiring7Days.tsx`
- `VerificationExpired.tsx`

Update cron job (`src/app/api/cron/verification-expiry/route.ts`) to send emails instead of console logs.

#### In-App Notifications
Integrate with Pusher for real-time notifications:
- Verification approved
- Verification rejected
- Expiring soon reminders

### 6. Testing 🟢 LOW PRIORITY (Future)

#### Unit Tests
- `src/lib/verification.ts` - Matrix parsing and eligibility logic
- `src/lib/job-eligibility.ts` - Job filtering logic
- Expiry detection functions

#### Integration Tests
- API endpoint flows (submit → review → approve)
- Expiry sweeper job
- Badge creation on approval

#### E2E Tests
- Complete onboarding with verifications
- Job visibility based on qualifications
- Application blocking for ineligible jobs

### 7. Stripe Connect Integration 🟡 MEDIUM PRIORITY

While the schema includes `stripeAccountId`, additional work is needed:

#### Identity Verification
File: `src/app/api/verification/stripe-identity/route.ts`

```typescript
// Create Stripe Identity session
const session = await stripe.identity.verificationSessions.create({
  type: 'document',
  metadata: { userId: user.id }
})

// Auto-create IDENTITY verification on success
```

#### Connect Onboarding
Enhance existing Stripe Connect flow to automatically create:
- `BUSINESS` verification when Connect account is verified
- `COMPANIES_HOUSE` verification if company detected

### 8. Optional Enhancements 🟢 LOW PRIORITY (Phase 2)

#### Automated Checks
- Companies House API integration for auto-verification
- VAT number validation via HMRC API
- Open Banking integration for account holder name match

#### Risk Scoring
- Calculate risk score based on verifications held
- Use to adjust deposit requirements
- Boost search ranking for fully verified pros

#### Customer-Facing Features
- "Verified Pro" badge on listings
- Filter jobs by verified tradespeople only
- Verification details in tradesperson cards

---

## Deployment Checklist

Before deploying to production:

1. ✅ All code reviewed and approved
2. ❌ Database migration created and tested
3. ❌ Seed visibility rules loaded
4. ❌ Environment variables configured:
   - `CRON_SECRET` for expiry sweeper
   - (Optional) `COMPANIES_HOUSE_API_KEY`
   - (Optional) `VAT_VALIDATION_API_KEY`
5. ❌ Vercel Cron configured for `/api/cron/verification-expiry`
6. ❌ At least one user granted `ROLE_VERIFIER` in Clerk
7. ❌ Monitoring/logging configured for verification events
8. ❌ Customer-facing documentation updated
9. ❌ Support team trained on verification review process

---

## Rollout Strategy (Recommended)

### Phase 1: Beta (2-4 weeks)
- Enable for Scotland only, limited cohort
- Manual verification review only
- Monitor KPIs: conversion, time-to-verify, disputes
- Gather feedback from beta users

### Phase 2: England & Wales (4-6 weeks)
- Expand to England & Wales
- Focus on regulated trades (Gas Safe, Electrical CPS)
- Enable MCS as optional badge for heat pump installers

### Phase 3: Full Rollout (ongoing)
- All regions and trades
- Gradually increase automation (Companies House, VAT checks)
- Launch customer-facing trust signals
- Add advanced features (risk scoring, ranking boosts)

---

## Success Metrics

Track these KPIs post-launch:
- **Conversion**: Onboarding started → verified (per trade)
- **Time-to-verify**: Mean time from submission to approval
- **Gating impact**: % of jobs gated, % of quotes blocked
- **Dispute rate**: Pre/post verification launch comparison
- **Compliance**: % of insurance/credential expiry renewals
- **CSAT/NPS**: Customer satisfaction with verified jobs

---

## Known Limitations

1. **No automated scheme checks** - All verifications are manually reviewed by ops team
2. **No scheme API integrations** - Must manually verify against official registers
3. **Basic evidence storage** - Files stored with URLs, no OCR or parsing
4. **Manual expiry management** - Users must manually renew expired verifications
5. **No DBS integration** - DBS/Disclosure checks are manual uploads only

These are intentional for MVP and can be addressed in Phase 2.

---

## Questions for Product/Stakeholders

1. **Minimum insurance cover**: Should we enforce a minimum Public Liability amount (e.g., £2m)?
2. **MCS gating**: Should MCS be required (gated) for heat pump jobs, or remain optional?
3. **DBS visibility**: Should Basic DBS/Disclosure badges show by default, or only when pro opts in?
4. **Verification SLAs**: What's the target response time for ops to review verifications?
5. **Failed verification appeals**: Do we need an appeal/escalation workflow?
6. **Grandfathering**: Should existing tradespeople get a grace period before verification is enforced?

---

## Contact & Support

For technical questions about this implementation:
- See `docs/VERIFICATION_SYSTEM.md` for complete documentation
- Review code comments in key files
- Check Prisma schema for data model details

For product/business questions:
- Refer to original issue specification
- Consult with @josh (issue owner)
