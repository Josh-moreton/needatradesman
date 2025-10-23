# Airbnb-Style Pricing Integration Guide

## Overview

This document describes how to integrate the new Airbnb-style pricing system into the application.

## Features

- **Server-authoritative pricing**: All calculations done on the server
- **Integer pence math**: No floating-point errors
- **Configurable fees**: Platform and processor fees configurable via environment
- **Live fee preview**: Tradespeople see net-after-fees in real-time
- **Net target mode**: Reverse calculator to set gross from desired net
- **Customer-friendly display**: All-in total with optional breakdown
- **Deposit support**: Handles split payments (deposit + balance)

## Environment Configuration

Add these variables to your `.env` file:

```env
# Pricing configuration
PLATFORM_FEE_PCT=1.6
PROCESSOR_FEE_PCT=1.4
PROCESSOR_FEE_FIXED_PENCE=0

# Feature flag (set to 'true' to enable)
NEXT_PUBLIC_FEATURE_AIRBNB_PRICING=true
```

## Usage Examples

### 1. Tradesperson Quote Builder

Enable Airbnb pricing in the quote builder:

```tsx
import { QuoteBuilder } from '@/components/quotes/QuoteBuilder';
import { useFeatureFlags } from '@/lib/feature-flags';

function ApplicationForm() {
  const { airbnbPricing } = useFeatureFlags();
  
  return (
    <QuoteBuilder
      value={quoteItems}
      onChange={setQuoteItems}
      depositPercentage={depositPercentage}
      onDepositPercentageChange={setDepositPercentage}
      requiresDeposit={requiresDeposit}
      onRequiresDepositChange={setRequiresDeposit}
      enableAirbnbPricing={airbnbPricing}
      showTemplates={true}
      userId={userId}
    />
  );
}
```

### 2. Customer Price Display

Show all-in pricing to customers:

```tsx
import { CustomerTotal } from '@/components/pricing/CustomerTotal';

function JobDetails({ application }) {
  const totalPence = application.pricingSnapshot?.grossPence || 0;
  const subtotalPence = totalPence - (application.pricingSnapshot?.platformFeePence || 0);
  const customerFeePence = application.pricingSnapshot?.platformFeePence || 0;
  
  return (
    <CustomerTotal
      totalPence={totalPence}
      subtotalPence={subtotalPence}
      customerFeePence={customerFeePence}
      showBreakdown={true}
    />
  );
}
```

### 3. API Pricing Preview

Get authoritative pricing breakdown:

```typescript
const response = await fetch('/api/pricing/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'GROSS', // or 'NET_TARGET'
    amountPence: 100000, // £1,000
    depositPercentage: 50, // optional
  }),
});

const breakdown = await response.json();
console.log('Net to tradesperson:', breakdown.total.netFormatted);
```

### 4. Storing Pricing Snapshot

When creating an application, store the pricing snapshot:

```typescript
import { computePricingBreakdown, poundsToSafePence } from '@/lib/pricing';

async function createApplication(data) {
  const totalPence = poundsToSafePence(data.quote);
  
  const breakdown = computePricingBreakdown({
    mode: 'GROSS',
    amountPence: totalPence,
    depositPercentage: data.depositPercentage,
  });
  
  const pricingSnapshot = {
    grossPence: breakdown.total.grossPence,
    netPence: breakdown.total.netPence,
    platformFeePence: breakdown.total.platformFeePence,
    processorFeePence: breakdown.total.processorFeePence,
    processorFeeFixedPence: breakdown.total.processorFeeFixedPence,
    feeRates: {
      platform: breakdown.feeConfig.platformFeePercentage,
      processor: breakdown.feeConfig.processorFeePercentage,
      processorFixed: breakdown.feeConfig.processorFeeFixedPence,
    },
    computedAt: breakdown.computedAt,
    depositPercentage: data.depositPercentage,
  };
  
  await prisma.application.create({
    data: {
      ...data,
      pricingSnapshot: JSON.stringify(pricingSnapshot),
    },
  });
}
```

## Fee Calculations

### Formula: Net from Gross

```
N = floor(G * (1 - p - s)) - f

Where:
- N = net to tradesperson (pence)
- G = gross charge to customer (pence)
- p = platform fee % (e.g., 0.016 for 1.6%)
- s = processor fee % (e.g., 0.014 for 1.4%)
- f = processor fixed fee (pence)
```

### Formula: Gross from Net

```
G = ceil((N + f) / (1 - p - s))

Where:
- G = gross charge to customer (pence)
- N = target net for tradesperson (pence)
- p = platform fee %
- s = processor fee %
- f = processor fixed fee (pence)
```

## Testing

### Manual Testing

1. Set `NEXT_PUBLIC_FEATURE_AIRBNB_PRICING=true` in your `.env.local`
2. Start the dev server: `pnpm dev`
3. Navigate to an application form
4. Enter quote items and observe live fee preview
5. Toggle "Set a net target" to test reverse calculator
6. Submit application and verify pricing snapshot is stored

### API Testing

```bash
# Test gross mode
curl -X POST http://localhost:3000/api/pricing/preview \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "GROSS",
    "amountPence": 100000,
    "depositPercentage": 50
  }'

# Test net target mode
curl -X POST http://localhost:3000/api/pricing/preview \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "NET_TARGET",
    "amountPence": 97000
  }'
```

## Migration Guide

### For Existing Applications

Existing applications without pricing snapshots will continue to work. The system gracefully handles missing snapshots by falling back to the quote amount.

### Gradual Rollout

1. **Phase 1**: Deploy with feature flag OFF (`NEXT_PUBLIC_FEATURE_AIRBNB_PRICING=false`)
2. **Phase 2**: Enable for 10% of users (A/B test)
3. **Phase 3**: Monitor metrics (acceptance rate, disputes)
4. **Phase 4**: Roll out to 50%, then 100%
5. **Phase 5**: Remove feature flag and legacy code

## Best Practices

1. **Always use integer pence** for monetary calculations
2. **Never trust client calculations** - validate server-side
3. **Store pricing snapshots** for audit trail
4. **Show net-after-fees prominently** to tradespeople
5. **Keep customer UI simple** - all-in total by default
6. **Test edge cases**: £0.01, £1, £10, £1000, £10000

## Troubleshooting

### Pricing not showing

- Check feature flag: `NEXT_PUBLIC_FEATURE_AIRBNB_PRICING=true`
- Verify environment variables are loaded
- Check browser console for errors

### Fees seem wrong

- Verify `PLATFORM_FEE_PCT` and `PROCESSOR_FEE_PCT` values
- Check that calculations use pence, not pounds
- Review API response for actual breakdown

### Round-trip validation fails

- Acceptable difference: ≤2 pence (due to ceil/floor rounding)
- If difference >2p, check fee configuration

## Support

For questions or issues with the pricing system:
1. Check this guide first
2. Review inline code documentation
3. Check `/tmp/pricing-tests/test-pricing.js` for calculation examples
4. Contact the development team
