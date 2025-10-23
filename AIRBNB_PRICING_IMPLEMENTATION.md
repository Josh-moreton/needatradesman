# Airbnb-Style Pricing Implementation - Summary

## Overview

This implementation adds a complete Airbnb-style pricing system to the needatradesman marketplace, with transparent fee breakdowns for customers and net-after-fees visibility for tradespeople.

## What Was Implemented

### 1. Core Pricing Engine (`src/lib/pricing.ts`)
- Server-authoritative calculations using integer pence (no floating-point errors)
- Two calculation modes:
  - **Gross → Net**: Calculate tradesperson net from customer charge
  - **Net Target → Gross**: Calculate customer charge from desired tradesperson net
- Support for split payments (deposit + balance)
- Configurable fees via environment variables

### 2. API Endpoint (`src/app/api/pricing/preview/route.ts`)
- POST `/api/pricing/preview`
- Returns authoritative pricing breakdown
- Zod validation for request body
- Supports both GROSS and NET_TARGET modes
- Handles deposit percentage calculations

### 3. Tradesperson Quote Builder Enhancements
- **QuoteFeesPopover**: Info button showing fee breakdown (1.6% platform + 1.4% processor)
- **NetTargetSwitch**: Toggle between gross and net target modes
- **Enhanced QuoteBuilder**: Live fee preview with debounced API calls
- Shows estimated take-home after fees
- Displays deposit/balance breakdown when applicable

### 4. Customer Pricing Components
- **CustomerTotal**: Shows all-in price with optional breakdown link
- **PriceBreakdownModal**: Displays subtotal + customer service fee = total
- Hides tradesperson fee (Airbnb-style - customer doesn't see provider fees)

### 5. Data Persistence
- Added `pricingSnapshot` JSON field to Application model
- Stores complete pricing breakdown with each quote
- Includes fee rates, computed timestamp, and all amounts
- Updated Zod schema validation

### 6. Feature Flag System
- Simple feature flag configuration in `src/lib/feature-flags.ts`
- Controlled via `NEXT_PUBLIC_FEATURE_AIRBNB_PRICING` env variable
- Allows gradual rollout and instant rollback

### 7. UI Components
- Created `src/components/ui/popover.tsx` using Radix UI
- Added dependency: `@radix-ui/react-popover`

## Configuration

### Environment Variables

```env
# Fee configuration
PLATFORM_FEE_PCT=1.6              # Platform fee percentage
PROCESSOR_FEE_PCT=1.4             # Card processor fee percentage
PROCESSOR_FEE_FIXED_PENCE=0       # Fixed per-transaction fee (optional)

# Feature flag
NEXT_PUBLIC_FEATURE_AIRBNB_PRICING=false  # Set to 'true' to enable
```

## Fee Structure

**Default Configuration:**
- Platform fee: 1.6%
- Processor fee: 1.4%
- Total fees: 3.0%

**Example:**
- Customer pays: £1,000.00
- Platform fee: £16.00
- Processor fee: £14.00
- Tradesperson receives: £970.00

## Files Changed

```
.env.example                                   - Added fee config
docs/AIRBNB_PRICING_GUIDE.md                   - Integration guide
package.json                                   - Added popover dependency
prisma/schema.prisma                           - Added pricingSnapshot field
src/app/api/pricing/preview/route.ts           - NEW: Pricing API
src/components/pricing/CustomerTotal.tsx       - NEW: Customer display
src/components/pricing/PriceBreakdownModal.tsx - NEW: Breakdown modal
src/components/quotes/NetTargetSwitch.tsx      - NEW: Mode toggle
src/components/quotes/QuoteBuilder.tsx         - Enhanced with pricing
src/components/quotes/QuoteFeesPopover.tsx     - NEW: Fee info popover
src/components/ui/popover.tsx                  - NEW: Popover component
src/lib/feature-flags.ts                       - NEW: Feature flags
src/lib/pricing.ts                             - NEW: Core pricing logic
src/lib/schemas.ts                             - Added pricing snapshot schema
src/lib/types/pricing.ts                       - NEW: TypeScript types
```

## Testing

### Automated Tests Created
- `/tmp/pricing-tests/test-pricing.js` - Validates calculations for various amounts
- Tested amounts: £10, £1,000, £10,000
- Verified with fixed processor fees
- Confirmed integer pence math (no floating-point errors)

### Manual Test Cases
1. ✅ Small amounts (£1-£10)
2. ✅ Medium amounts (£100-£1,000)
3. ✅ Large amounts (£10,000+)
4. ✅ Various deposit percentages (0%, 10%, 50%, 90%)
5. ✅ Processor fixed fees (0p, 20p)
6. ✅ Round-trip validation (gross → net → gross)

## How to Use

### 1. Enable the Feature

```bash
# In .env.local
NEXT_PUBLIC_FEATURE_AIRBNB_PRICING=true
PLATFORM_FEE_PCT=1.6
PROCESSOR_FEE_PCT=1.4
PROCESSOR_FEE_FIXED_PENCE=0
```

### 2. Run Database Migration

```bash
pnpm prisma migrate dev -n "add_pricing_snapshot"
```

### 3. Integrate in Quote Builder

```tsx
import { QuoteBuilder } from '@/components/quotes/QuoteBuilder';
import { useFeatureFlags } from '@/lib/feature-flags';

function MyForm() {
  const { airbnbPricing } = useFeatureFlags();
  
  return (
    <QuoteBuilder
      enableAirbnbPricing={airbnbPricing}
      // ... other props
    />
  );
}
```

### 4. Display Customer Pricing

```tsx
import { CustomerTotal } from '@/components/pricing/CustomerTotal';

function JobDetails({ application }) {
  return (
    <CustomerTotal
      totalPence={application.pricingSnapshot?.grossPence}
      subtotalPence={application.pricingSnapshot?.netPence}
      customerFeePence={application.pricingSnapshot?.platformFeePence}
    />
  );
}
```

## Deployment Strategy

### Phase 1: Deploy with Flag OFF
- Deploy all code with `NEXT_PUBLIC_FEATURE_AIRBNB_PRICING=false`
- Run database migration
- Verify no regressions

### Phase 2: A/B Test (10%)
- Enable for 10% of users
- Monitor metrics:
  - Quote acceptance rate
  - Average quote size
  - Dispute rate
  - Completion rate

### Phase 3: Gradual Rollout
- 10% → 25% → 50% → 75% → 100%
- Monitor at each stage
- Rollback capability via feature flag

### Phase 4: Cleanup
- Remove feature flag checks
- Remove legacy pricing code
- Update documentation

## Benefits

### For Customers
- ✅ Clear all-in pricing (Airbnb-style)
- ✅ No surprise fees at checkout
- ✅ Optional breakdown for transparency
- ✅ Simplified decision-making

### For Tradespeople
- ✅ See net-after-fees immediately
- ✅ Set net target to ensure take-home
- ✅ Understand fee structure upfront
- ✅ No guesswork on earnings

### For Platform
- ✅ Reduced disputes
- ✅ Increased trust
- ✅ Better conversion rates
- ✅ Competitive with Airbnb/similar platforms

## Documentation

- **Integration Guide**: `docs/AIRBNB_PRICING_GUIDE.md`
- **API Documentation**: Inline comments in `src/app/api/pricing/preview/route.ts`
- **Component Examples**: See guide for usage patterns

## Support

For questions or issues:
1. Review `docs/AIRBNB_PRICING_GUIDE.md`
2. Check inline code documentation
3. Run test scripts in `/tmp/pricing-tests/`
4. Contact development team

## Metrics to Monitor

After rollout, track:
- Quote acceptance rate (expect increase)
- Average quote size (may normalize)
- Dispute rate (expect decrease)
- Time to accept quote (expect decrease)
- User feedback on pricing clarity
- Support tickets related to fees

## Known Limitations

1. **Round-trip tolerance**: Gross → Net → Gross may differ by ≤2 pence (acceptable)
2. **VAT handling**: Not included in this phase (future enhancement)
3. **Refund policy**: Fee retention on refunds not yet defined
4. **Coupons/discounts**: Not supported in this phase

## Future Enhancements

- [ ] Per-tradesperson VAT profiles
- [ ] Tiered or dynamic customer service fees
- [ ] Promotional discounts/credits
- [ ] Refund/chargeback policy UI
- [ ] Analytics dashboard for pricing metrics
- [ ] International currency support

---

**Implementation Status**: ✅ Complete and ready for deployment
**Code Quality**: ✅ All lints and type-checks pass
**Documentation**: ✅ Comprehensive guide provided
**Testing**: ✅ Manual tests verified
**Next Step**: Run database migration and enable feature flag in staging
