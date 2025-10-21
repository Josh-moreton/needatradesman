# Stripe Terminal Integration for Connect Accounts

## Overview

This document outlines the integration of Stripe Terminal (handheld card readers) for tradespeople to accept final payments on-site. This allows tradespeople to take card payments at the customer's location when the job is completed, providing an alternative to online payment through the platform.

## Business Requirements

### User Story
As a tradesperson, I want to accept card payments on-site using a handheld card reader so that I can receive final payment immediately when I complete a job at the customer's location.

### Benefits
- **Immediate Payment**: Tradesperson can collect payment on-site without waiting for customer to pay online
- **Customer Convenience**: Customers can pay with card when the job is complete
- **Professional Experience**: Physical card reader provides professional checkout experience
- **Platform Control**: All payments flow through the platform maintaining fee structure and compliance

## Stripe Terminal Architecture

### What is Stripe Terminal?

Stripe Terminal is Stripe's programmable point-of-sale solution that allows businesses to accept in-person payments. It consists of:

1. **Card Readers**: Physical devices that accept chip, tap, and swipe payments
2. **Terminal SDK**: Software to connect to and control readers
3. **Payment Processing**: Integrated with Stripe's payment infrastructure

### Supported Readers

For UK market (our target):

| Reader | Type | Connectivity | Price | Best For |
|--------|------|--------------|-------|----------|
| **Tap to Pay on iPhone** | Software | Built-in | £0 | iPhone users (no hardware needed) |
| **BBPOS WisePad 3** | Mobile | Bluetooth | £59 | Mobile tradespeople |
| **Stripe Reader M2** | Mobile | Bluetooth + 4G | £99 | Standalone use |
| **WisePOS E** | Countertop | WiFi/Ethernet | £299 | Larger operations |

**Recommended options**:
1. **Tap to Pay on iPhone** (FREE, no hardware) - Best for iPhone users
2. **BBPOS WisePad 3** (£59, Bluetooth) - Best for non-iPhone or those preferring physical readers

### Tap to Pay on iPhone

**What is Tap to Pay on iPhone?**

Tap to Pay on iPhone is a software-based solution that turns compatible iPhones into contactless payment terminals - no physical card reader hardware required. Customers simply tap their contactless card, Apple Pay, or other digital wallet on the tradesperson's iPhone to complete payment.

**Key Benefits**:
- ✅ **Zero Hardware Cost**: No need to purchase physical card readers
- ✅ **Instant Setup**: Works immediately on compatible iPhones
- ✅ **Always Available**: Built into the iPhone - can't be lost or forgotten
- ✅ **Lower Barrier**: Perfect for tradespeople already using iPhones
- ✅ **Same Security**: PCI-DSS compliant, same encryption as physical readers

**Requirements**:
- iPhone XS or newer
- iOS 15.4 or later
- UK-based Stripe account
- Stripe Connect account set up

**Limitations**:
- ⚠️ Contactless only (no chip & PIN or swipe)
- ⚠️ iOS devices only (no Android support)
- ⚠️ Requires active internet connection
- ⚠️ May have transaction limits (typically £100 for contactless)

**When to Use**:
- Tradesperson already owns iPhone XS or newer
- Want to get started immediately without waiting for hardware
- Occasional payments where dedicated hardware isn't justified
- Backup payment method when physical reader unavailable

**Implementation Note**: Tap to Pay requires the Stripe Terminal iOS SDK in the mobile app. Backend API support is included in this PR, but frontend integration requires native iOS development.

### Terminal with Connect Accounts

When using Terminal with Stripe Connect:

1. **Location Management**: Each Connect account can have Terminal locations
2. **Reader Assignment**: Readers are registered to specific locations/accounts
3. **Payment Processing**: Payments are processed on behalf of the Connect account
4. **Fee Structure**: Our platform fees work the same as online payments

## Technical Implementation

### Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Tradesperson  │────────▶│  Card Reader     │────────▶│  Customer Card  │
│   (Mobile App)  │         │  (via Bluetooth) │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │
        │ Internet                   │
        ▼                            ▼
┌─────────────────┐         ┌──────────────────┐
│   Platform API  │◀────────│  Stripe Terminal │
│  (Next.js)      │         │   API            │
└─────────────────┘         └──────────────────┘
        │
        ▼
┌─────────────────┐
│   Database      │
│   (PostgreSQL)  │
└─────────────────┘
```

### Database Schema Changes

```prisma
model User {
  // ... existing fields ...
  stripeTerminalLocationId String? // Terminal location for this tradesperson
  terminalReaderId        String? // Associated reader ID
}

model Job {
  // ... existing fields ...
  finalPaymentMethod      String? // "online" | "terminal"
  terminalPaymentIntentId String? // For Terminal payments
}
```

### API Endpoints

#### 1. Create Terminal Location

```typescript
POST /api/stripe/terminal/location

// Creates a Terminal location for the tradesperson
// Required for registering readers
```

#### 2. Register Reader

```typescript
POST /api/stripe/terminal/reader/register

// Registers a physical reader to tradesperson's location
// Returns reader ID and connection token
```

#### 3. Create Payment Intent for Terminal

```typescript
POST /api/stripe/terminal/payment-intent

Body: {
  jobId: string
  amount: number
  readerId: string
}

// Creates a payment intent for Terminal payment
// Links to specific job
```

#### 4. Process Terminal Payment

```typescript
POST /api/stripe/terminal/process-payment

Body: {
  paymentIntentId: string
  jobId: string
}

// Confirms payment through Terminal reader
// Updates job status
```

#### 5. Get Reader Status

```typescript
GET /api/stripe/terminal/reader/status?readerId={id}

// Returns current reader status (online, offline, in_use)
```

### Frontend Components

#### Terminal Reader Management

```tsx
// src/components/terminal/TerminalReaderSetup.tsx
// - UI for pairing new card reader
// - Display reader status
// - Test card reader connection
```

#### In-Person Payment Flow

```tsx
// src/components/terminal/TerminalPayment.tsx
// - Initiate Terminal payment
// - Display payment status
// - Handle success/failure
```

### Payment Flow

#### Sequence Diagram: Terminal Payment

```
Customer        Tradesperson      Platform API    Stripe Terminal    Reader
   │                 │                  │               │              │
   │  Job Complete   │                  │               │              │
   │◀────────────────┤                  │               │              │
   │                 │                  │               │              │
   │                 │ Select "Card     │               │              │
   │                 │  Payment"        │               │              │
   │                 │─────────────────▶│               │              │
   │                 │                  │               │              │
   │                 │                  │ Create        │              │
   │                 │                  │ PaymentIntent │              │
   │                 │                  │──────────────▶│              │
   │                 │                  │◀──────────────│              │
   │                 │                  │               │              │
   │                 │ "Insert Card"    │               │              │
   │                 │◀─────────────────│               │              │
   │                 │                  │               │              │
   │                 │ (Shows reader)   │               │  Connect     │
   │                 │─────────────────────────────────▶│  to Reader   │
   │                 │                  │               │◀─────────────│
   │                 │                  │               │              │
   │  Insert/Tap Card│                  │               │              │
   │────────────────────────────────────────────────────────────────▶│
   │                 │                  │               │              │
   │                 │                  │               │  Process     │
   │                 │                  │               │◀─────────────│
   │                 │                  │               │              │
   │                 │                  │  Webhook:     │              │
   │                 │                  │  payment_     │              │
   │                 │                  │  intent.      │              │
   │                 │                  │  succeeded    │              │
   │                 │                  │◀──────────────│              │
   │                 │                  │               │              │
   │                 │ "Payment Success"│               │              │
   │◀────────────────┤◀─────────────────│               │              │
   │                 │                  │               │              │
```

## Implementation Steps

### Phase 1: Core Integration (Week 1)

1. **Add Terminal Capabilities to Stripe Connect Accounts**
   - Update account creation to request Terminal capabilities
   - Add `card_present` capability alongside existing capabilities

2. **Implement Location Management**
   - API endpoint to create Terminal location for tradesperson
   - Store location ID in User model
   - Validate UK address format

3. **Reader Registration Flow**
   - API endpoint to register reader to location
   - Generate connection tokens for reader pairing
   - Store reader ID in User model

### Phase 2: Payment Processing (Week 2)

4. **Terminal Payment Intent Creation**
   - Endpoint to create payment intent for Terminal
   - Link to existing job
   - Apply same fee structure as online payments

5. **Payment Processing**
   - Handle Terminal payment confirmation
   - Update job status on successful payment
   - Trigger webhooks for payment success

6. **Frontend Components**
   - Reader setup wizard
   - Payment processing UI
   - Reader status display

### Phase 3: Testing & Rollout (Week 3)

7. **Test Mode Implementation**
   - Use Stripe Terminal test readers
   - Test all payment scenarios
   - Error handling and edge cases

8. **Documentation**
   - User guide for tradespeople
   - Setup instructions
   - Troubleshooting guide

9. **Gradual Rollout**
   - Beta program with select tradespeople
   - Collect feedback
   - Full rollout

## Reader Procurement Options

### Option 1: Platform Provides Readers (Recommended)

**Approach**: Platform purchases readers in bulk and ships to tradespeople

**Pros**:
- Volume discounts (£50-55 per reader vs £59 retail)
- Quality control
- Pre-configured readers
- Easier support

**Cons**:
- Upfront capital required
- Inventory management
- Shipping logistics

**Implementation**:
```typescript
// Add to User model
readerDeposit: Decimal? // £50 refundable deposit
readerShippingAddress: Json? // Shipping details
readerStatus: "requested" | "shipped" | "delivered" | "active"
```

### Option 2: Tradesperson Purchase Direct

**Approach**: Tradespeople purchase readers from Stripe directly

**Pros**:
- No platform capital required
- No inventory management
- Tradesperson owns device

**Cons**:
- Higher per-unit cost
- Inconsistent experience
- Setup complexity

### Option 3: Hybrid Model (Best for Launch)

**Phase 1**: Platform provides first 50 readers to beta testers (subsidized or free)
**Phase 2**: Charge £50 refundable deposit for new readers
**Phase 3**: Allow direct purchase option for tradespeople who prefer

## Fee Structure

Terminal payments follow the same fee structure as online payments:

```typescript
// Customer pays: amount + 6% platform fee
// Tradesperson receives: amount - 4% platform fee
// Platform collects: 10% total (4% + 6%)

// Example: £100 final payment
const customerTotal = 100 + (100 * 0.06) = £106
const tradespersonReceives = 100 - (100 * 0.04) = £96
const platformFee = 6 + 4 = £10
```

**Stripe Terminal Processing Fees** (added to platform fee):
- Card Present: 1.5% + 20p per transaction
- These are passed through to the customer or absorbed by platform

## Security & Compliance

### PCI Compliance

✅ **Advantage of Stripe Terminal**: 
- Stripe-certified readers maintain PCI compliance
- No card data passes through our servers
- End-to-end encryption

### Data Protection

- Reader-to-Stripe communication is encrypted
- No card numbers stored in our database
- Payment tokens only

### Dispute Handling

- Terminal payments have lower dispute rates (card present verification)
- Same dispute process as online payments
- Platform remains merchant of record

## User Experience

### For Tradespeople

#### Initial Setup (One-time)

1. Navigate to "Payments" → "Card Reader Setup"
2. Click "Order Card Reader" (£50 deposit)
3. Receive reader in 2-3 business days
4. Follow pairing instructions in app
5. Test transaction with dummy card
6. Ready to accept payments

#### Taking Payment

1. Complete job with customer
2. Open job in app
3. Click "Take Payment on Card Reader"
4. Enter amount (pre-filled with remaining balance)
5. Hand reader to customer
6. Customer inserts/taps card
7. Payment confirmed
8. Both parties receive receipt

### For Customers

1. Job completed
2. Tradesperson initiates payment
3. Insert or tap card on reader
4. PIN if required
5. Receipt via email
6. Job marked complete

## Monitoring & Support

### Key Metrics

- Reader activation rate
- Payments per reader per month
- Online vs Terminal payment ratio
- Reader error rate
- Customer satisfaction with Terminal payments

### Support Resources

1. **Reader Setup Guide**: Step-by-step with photos
2. **Troubleshooting**: Common issues (connection, battery, etc.)
3. **Video Tutorials**: Pairing, taking first payment
4. **Support Chat**: In-app help for Technical issues

### Common Issues

| Issue | Solution |
|-------|----------|
| Reader won't pair | Check Bluetooth enabled, battery charged |
| Payment declined | Try another card, check internet |
| Reader offline | Restart reader, check connection |
| Low battery | Charge via USB-C cable provided |

## Cost Analysis

### Per-Reader Economics

**Initial Investment (Platform Provides)**:
```
Reader cost: £55 (volume pricing)
Shipping: £5
Support materials: £5
Total per reader: £65

Deposit collected: £50
Platform investment: £15 per reader
```

**Revenue Per Reader**:
```
Assumption: £1,000 processed per month
Platform fee: £100 per month (10%)
Terminal processing: £17 (1.7% average)
Net platform revenue: £83 per month

ROI: 15 / 83 = 0.18 months (5.4 days payback)
```

### Break-Even Analysis

- **Readers needed**: 100 (for launch)
- **Total investment**: £1,500 (100 × £15)
- **Monthly revenue** (at 50% utilization): £4,150
- **Break-even**: 0.36 months (11 days)

**Conclusion**: Highly profitable investment

## Risks & Mitigation

### Risk 1: Reader Loss/Damage

**Mitigation**:
- £50 refundable deposit
- Insurance option (£5/month)
- Replacement reader policy

### Risk 2: Low Adoption

**Mitigation**:
- Free pilot program for first 50 users
- Success stories and testimonials
- Training and support

### Risk 3: Technical Issues

**Mitigation**:
- Extensive testing in beta
- 24/7 support during launch
- Fallback to online payment always available

### Risk 4: Reader Return Management

**Mitigation**:
- Prepaid return labels
- 30-day return window
- Refund deposit minus damage fees

## Timeline

### Month 1: Development
- Week 1-2: Core Terminal API integration
- Week 3-4: Frontend components and testing

### Month 2: Beta Program
- Week 1: Recruit 10 beta testers
- Week 2-3: Ship readers, provide support
- Week 4: Collect feedback, iterate

### Month 3: Full Launch
- Week 1: Order 100 readers
- Week 2-3: Marketing campaign
- Week 4: Open to all tradespeople

## Success Criteria

- ✅ 30% of tradespeople request a reader within 3 months
- ✅ 20% of final payments processed via Terminal within 6 months
- ✅ <5% reader return rate
- ✅ >95% payment success rate on Terminal
- ✅ >4.5/5 customer satisfaction rating

## Alternatives Considered

### Alternative 1: Partner with Square/SumUp

**Pros**: Established hardware, no development needed
**Cons**: Higher fees (2.5-2.75%), less integration, different brand

**Decision**: Build with Stripe for better integration and economics

### Alternative 2: Mobile Phone Readers Only

**Pros**: Lower cost (£40 vs £59)
**Cons**: Less professional, reliability concerns, limited to iOS/Android

**Decision**: Offer both, default to dedicated reader

### Alternative 3: Virtual Terminal Only

**Pros**: No hardware needed
**Cons**: Card details must be manually entered, higher fraud risk, not PCI friendly

**Decision**: Not suitable for in-person payments

## Next Steps

1. **Approve this proposal**: Technical lead + Product + Finance sign-off
2. **Order test readers**: 3-5 units for development
3. **Begin Phase 1 development**: Terminal API integration
4. **Recruit beta testers**: Identify 10 active tradespeople
5. **Plan marketing campaign**: Launch announcement, guides

## Questions & Answers

**Q: Can customers still pay online?**
A: Yes, Terminal is an additional option, not a replacement

**Q: What if reader is lost/stolen?**
A: Report immediately, we deactivate remotely, charge deposit if not returned

**Q: Do tradespeople need smartphone?**
A: Yes, for WisePad 3 (Bluetooth). Reader M2 has standalone mode but less recommended

**Q: What about refunds?**
A: Same process as online - processed through Stripe, funds returned to original card

**Q: International cards?**
A: Yes, Terminal accepts all major card networks (Visa, Mastercard, Amex)

---

**Document Status**: Proposal  
**Last Updated**: 2025-10-21  
**Author**: Engineering Team  
**Reviewers Needed**: Product, Finance, Technical Lead
