# Airbnb-Style Pricing - Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AIRBNB PRICING SYSTEM                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FEATURE FLAG CONTROL                        │
│                                                                  │
│  NEXT_PUBLIC_FEATURE_AIRBNB_PRICING=true/false                  │
│  Controls rollout of new pricing system                         │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONFIGURATION (env vars)                      │
│                                                                  │
│  • PLATFORM_FEE_PCT=1.6                                         │
│  • PROCESSOR_FEE_PCT=1.4                                        │
│  • PROCESSOR_FEE_FIXED_PENCE=0                                  │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CORE PRICING ENGINE                           │
│                   (src/lib/pricing.ts)                           │
│                                                                  │
│  Functions:                                                      │
│  • computeNetFromGross(grossPence) → netPence                   │
│  • computeGrossFromNet(netPence) → grossPence                   │
│  • computePricingBreakdown(inputs) → breakdown                  │
│                                                                  │
│  Uses integer pence throughout (no floating-point)              │
└─────────────────────────────────────────────────────────────────┘
                                 │
                ┌────────────────┴────────────────┐
                ▼                                  ▼
┌──────────────────────────────┐  ┌──────────────────────────────┐
│    API ENDPOINT              │  │    TYPES & SCHEMAS           │
│ /api/pricing/preview         │  │ (src/lib/types/pricing.ts)   │
│                              │  │ (src/lib/schemas.ts)         │
│ POST with:                   │  │                              │
│ • mode: GROSS|NET_TARGET     │  │ • PricingBreakdown           │
│ • amountPence                │  │ • ChargeBreakdown            │
│ • depositPercentage?         │  │ • FeeConfig                  │
│                              │  │ • PricingSnapshot (for DB)   │
│ Returns:                     │  │                              │
│ • Complete fee breakdown     │  └──────────────────────────────┘
│ • Deposit/balance splits     │
└──────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE PERSISTENCE                          │
│                  (prisma/schema.prisma)                          │
│                                                                  │
│  Application {                                                   │
│    pricingSnapshot Json? // Stores complete pricing breakdown   │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                      UI COMPONENTS                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              TRADESPERSON QUOTE BUILDER                          │
│          (src/components/quotes/QuoteBuilder.tsx)                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Quote Items List                                           │ │
│  │ • Description, Qty, Unit Price                             │ │
│  │ • Total: £1,000.00                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Fee Information Popover                                    │ │
│  │ (QuoteFeesPopover.tsx)                                     │ │
│  │                                                              │ │
│  │  [i] How fees work                                         │ │
│  │  • Platform fee: 1.6%                                      │ │
│  │  • Card processing: 1.4%                                   │ │
│  │  • Total: 3.0%                                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Mode Toggle (NetTargetSwitch.tsx)                         │ │
│  │                                                              │ │
│  │  [⇄ Set a net target]                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Live Fee Preview                                           │ │
│  │                                                              │ │
│  │  Estimated take-home after fees: £970.00                   │ │
│  │  Customer sees: £1,000.00                                  │ │
│  │                                                              │ │
│  │  If deposit (50%):                                         │ │
│  │  • Deposit: £500.00 → you get £485.00                     │ │
│  │  • Balance: £500.00 → you get £485.00                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│               CUSTOMER PRICING DISPLAY                           │
│          (src/components/pricing/CustomerTotal.tsx)              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ £1,000.00                                                  │ │
│  │ Total to pay                                               │ │
│  │                                                              │ │
│  │ Taxes/fees included where applicable                       │ │
│  │                                                              │ │
│  │ [View price breakdown]  ← Opens modal                     │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│           PRICE BREAKDOWN MODAL (optional)                       │
│        (src/components/pricing/PriceBreakdownModal.tsx)          │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Price breakdown                                            │ │
│  │                                                              │ │
│  │ Project subtotal         £970.00                           │ │
│  │ Customer service fee      £30.00                           │ │
│  │ ─────────────────────────────────                          │ │
│  │ Total                  £1,000.00                           │ │
│  │                                                              │ │
│  │ The customer service fee helps us maintain the platform    │ │
│  │ and provide support throughout your project.               │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                         DATA FLOW                                │
└─────────────────────────────────────────────────────────────────┘

TRADESPERSON enters quote items
        │
        ▼
QuoteBuilder calculates total (£1,000)
        │
        ▼
Debounced API call to /api/pricing/preview
        │
        ▼
Server computes breakdown:
  • Gross: £1,000.00
  • Platform fee (1.6%): £16.00
  • Processor fee (1.4%): £14.00
  • Net to tradesperson: £970.00
        │
        ▼
QuoteBuilder displays preview:
  "Estimated take-home: £970.00"
        │
        ▼
Tradesperson submits application
        │
        ▼
Server stores pricingSnapshot in DB:
  {
    grossPence: 100000,
    netPence: 97000,
    platformFeePence: 1600,
    processorFeePence: 1400,
    feeRates: { platform: 1.6, processor: 1.4 },
    computedAt: "2025-10-23T08:48:47.176Z"
  }
        │
        ▼
CUSTOMER views job application
        │
        ▼
CustomerTotal displays:
  "£1,000.00 Total to pay"
  [View price breakdown]
        │
        ▼
Customer clicks breakdown (optional)
        │
        ▼
PriceBreakdownModal shows:
  Project subtotal: £970.00
  Customer service fee: £30.00
  Total: £1,000.00


┌─────────────────────────────────────────────────────────────────┐
│                      KEY PRINCIPLES                              │
└─────────────────────────────────────────────────────────────────┘

1. SERVER AUTHORITATIVE
   All calculations happen server-side, client just displays

2. INTEGER PENCE MATH
   No floating-point arithmetic, everything in smallest unit

3. AIRBNB-STYLE UX
   • Customer sees all-in price by default
   • Tradesperson sees net-after-fees
   • Breakdown available but not prominent

4. TRANSPARENCY
   • Fee percentages clearly shown
   • Optional detailed breakdown
   • No hidden surprises

5. FEATURE FLAG CONTROL
   • Can be rolled back instantly
   • Gradual rollout capability
   • A/B testing ready

6. AUDIT TRAIL
   • Every quote stores pricing snapshot
   • Immutable historical record
   • Dispute resolution support
