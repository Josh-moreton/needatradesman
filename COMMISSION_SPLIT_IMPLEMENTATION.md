# Commission Split Implementation Guide

## Overview

This document describes the implementation of the Airbnb-style split commission model where the 10% platform commission is shared between customers and tradespeople.

## Commission Structure

### Before (Old Model)
- Customer paid: Quote amount (100%)
- Tradesperson received: Quote - 10% platform fee (90%)
- Platform received: 10% of quote

### After (New Airbnb-Style Model)
- Customer pays: Quote + 6% platform fee (106%)
- Tradesperson receives: Quote - 4% platform fee (96%)
- Platform receives: 6% from customer + 4% from tradesperson = 10% total

## Example Calculations

### Simple Example: £100 Quote
- **Customer pays**: £106.00
  - Quote: £100.00
  - Platform fee (6%): £6.00
- **Tradesperson receives**: £96.00
  - Quote: £100.00
  - Platform fee (4%): -£4.00
- **Platform gets**: £10.00 (10% of original quote)

### Deposit Scenario: £1000 Quote with 50% Deposit
**Deposit Payment:**
- Customer pays: £530.00 (£500 deposit + £30 fee)
- Tradesperson receives: £480.00 (£500 - £20 fee)

**Final Payment:**
- Customer pays: £530.00 (£500 remaining + £30 fee)
- Tradesperson receives: £480.00 (£500 - £20 fee)

**Totals:**
- Customer total: £1060.00
- Tradesperson total: £960.00
- Platform total: £100.00 (10% of £1000 quote)

## Technical Implementation

### 1. Backend Changes

#### Stripe Configuration (`src/lib/stripe.ts`)
```typescript
export const STRIPE_CONFIG = {
    currency: 'gbp',
    platformFeePercentage: 10,      // Total (backward compatibility)
    customerFeePercentage: 6,        // NEW: Customer pays 6%
    tradespersonFeePercentage: 4,    // NEW: Tradesperson pays 4%
} as const
```

#### New Calculation Functions
- `calculateCustomerFee(quoteAmount)` - Returns 6% of quote in pence
- `calculateTradespersonFee(quoteAmount)` - Returns 4% of quote in pence
- `calculateCustomerTotal(quoteAmount)` - Returns quote + customer fee in pence
- `calculateTradespersonPayout(quoteAmount)` - Returns quote - tradesperson fee in pence

#### Stripe Checkout Integration
The checkout session now:
1. Charges customer: `quote + 6%` (line item unit_amount)
2. Deducts from tradesperson transfer: `6% + 4%` (application_fee_amount)
3. Result: Tradesperson receives `quote - 4%`

**Key Code Change in `checkout-session/route.ts`:**
```typescript
const customerFee = calculateCustomerFee(deposit);
const tradespersonFee = calculateTradespersonFee(deposit);
const customerTotal = calculateCustomerTotal(deposit);

const session = await stripe.checkout.sessions.create({
    line_items: [{
        price_data: {
            unit_amount: customerTotal, // Customer pays deposit + 6%
        },
    }],
    payment_intent_data: {
        application_fee_amount: customerFee + tradespersonFee, // Total: 10%
    },
});
```

### 2. Frontend Changes

#### Payment Modals
All payment modals now show itemized breakdowns:

**DepositPaymentModal.tsx:**
- Shows deposit amount
- Shows platform fee (6%)
- Shows total due
- Explains fee structure in description

**FinalPaymentModal.tsx:**
- Shows remaining balance
- Shows platform fee (6%)
- Shows total due
- Button displays correct total amount

**JobAcceptance.tsx:**
- Shows tradesperson quote
- Shows deposit amount
- Shows platform fee (6%)
- Shows total due now
- Explains split commission in terms

#### ManageResponsesClient.tsx
Updated the "Pay Deposit" button to show the correct total including customer fee:
```tsx
💳 Pay Deposit (£{totalDue.toFixed(2)})
```

#### ResponseForm.tsx
Added transparency for tradespeople submitting quotes:
```
"Provide an estimated quote in GBP for the work. You will receive this 
amount minus a 4% platform fee. The customer pays the quote plus a 6% 
platform fee."
```

## Testing Performed

### Unit Tests (Manual)
- ✅ £100 quote: Customer pays £106, Tradesperson gets £96, Platform gets £10
- ✅ £1000 quote: Customer pays £1060, Tradesperson gets £960, Platform gets £100
- ✅ £250.50 quote: Handles decimal amounts correctly
- ✅ £50 quote: Works with small amounts

### Integration Tests (Manual)
- ✅ 50% deposit scenario with £1000 quote
- ✅ No-deposit scenario (full payment at completion)
- ✅ Type-check passes
- ✅ Linter passes with no errors

## Backward Compatibility

The implementation maintains backward compatibility:
- Old `calculatePlatformFee()` function is deprecated but still available
- Old `calculateTradespersonAmount()` function still works
- Metadata includes both old and new fee fields for debugging

## User Experience

### For Customers
1. Clear breakdown shown before payment
2. Understand they're paying quote + 6% platform fee
3. See total amount upfront (no surprises)
4. Know that tradesperson also pays a fee

### For Tradespeople
1. Informed about 4% platform fee when submitting quote
2. Receive quote amount minus 4%
3. Transparent about commission split
4. Similar to Airbnb, Uber, and other platforms

## Deployment Notes

### Prerequisites
- No database migrations required
- No environment variable changes needed
- Stripe Connect must be configured (already is)

### Rollout
1. Deploy backend changes first (API routes)
2. Deploy frontend changes (UI components)
3. Monitor first few transactions
4. Verify Stripe transfers are correct

### Monitoring
After deployment, verify:
- Stripe Checkout sessions have correct `unit_amount`
- Application fees equal 6% + 4% = 10%
- Transfers to tradespeople are quote - 4%
- Customer sees correct total on Stripe Checkout page

## Support & Documentation

### Common Questions

**Q: Why split the commission?**
A: This is industry standard (Airbnb, Uber, Upwork). It's more transparent and psychologically easier for customers to accept paying slightly more when they know the tradesperson also pays a fee.

**Q: Does this change the total commission?**
A: No, the platform still receives 10% total. It's just split between customer (6%) and tradesperson (4%).

**Q: What about existing jobs?**
A: Existing jobs with pending payments will use the new model when they pay. Historical payments are unchanged.

**Q: Can we change the percentages?**
A: Yes, just update `STRIPE_CONFIG.customerFeePercentage` and `STRIPE_CONFIG.tradespersonFeePercentage`. They must add up to your desired total commission.

## Files Changed

### Backend
- `src/lib/stripe.ts` - Commission calculation functions
- `src/app/api/stripe/checkout-session/route.ts` - Deposit payment
- `src/app/api/stripe/final-payment/route.ts` - Final payment

### Frontend
- `src/components/payments/DepositPaymentModal.tsx`
- `src/components/payments/FinalPaymentModal.tsx`
- `src/components/payments/JobAcceptance.tsx`
- `src/app/(protected)/dashboard/my-jobs/[jobId]/ManageResponsesClient.tsx`
- `src/components/applications/ResponseForm.tsx`

## Future Enhancements

Potential improvements to consider:
1. Add commission calculator tool for tradespeople
2. Show historical commission data in dashboards
3. Consider tiered commission rates based on volume
4. Add commission reports for accounting
5. Consider regional commission variations

## Conclusion

The split commission model is now successfully implemented following the Airbnb pattern. The implementation is transparent, well-tested, and maintains backward compatibility while providing a better user experience for both customers and tradespeople.
