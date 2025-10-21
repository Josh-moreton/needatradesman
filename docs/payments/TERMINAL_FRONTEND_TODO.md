# Stripe Terminal Frontend Implementation TODO

## Overview

This document outlines the frontend work needed to complete the Stripe Terminal integration. The backend API is complete; this lists the UI components and flows required for tradespeople to use card readers.

## Status: Backend Complete ✅ | Frontend Pending ⏳

### Backend (Complete)
- ✅ Database schema with Terminal fields
- ✅ API endpoints for Terminal operations
- ✅ Webhook handlers for Terminal payments
- ✅ Stripe library functions
- ✅ Documentation complete

### Frontend (Pending)
This document covers the remaining work.

---

## Component Structure

### Component Organization

```
src/components/terminal/
├── TerminalSetup/
│   ├── LocationSetupForm.tsx       # Create Terminal location
│   ├── ReaderRegistration.tsx      # Pair card reader
│   └── SetupWizard.tsx            # Multi-step setup flow
├── TerminalPayment/
│   ├── PaymentInitiation.tsx      # Start Terminal payment
│   ├── PaymentProgress.tsx        # Show payment in progress
│   └── PaymentResult.tsx          # Show success/failure
├── TerminalManagement/
│   ├── ReaderStatus.tsx           # Show reader connection status
│   ├── ReaderSettings.tsx         # Reader configuration
│   └── ReaderList.tsx             # List of registered readers
└── shared/
    ├── TerminalIcon.tsx           # Card reader icon
    └── PaymentMethodBadge.tsx     # Show payment method badge
```

---

## Pages to Update

### 1. Tradesperson Dashboard Settings

**Path**: `/dashboard/settings` (or create new `/dashboard/terminal` page)

**New Section**: "Card Reader Setup"

```tsx
// Pseudo-code structure
<DashboardSettingsPage>
  <Section title="Card Reader Setup">
    {!hasTerminalLocation && <LocationSetupForm />}
    {hasTerminalLocation && !hasReader && <ReaderRegistration />}
    {hasTerminalLocation && hasReader && <ReaderManagement />}
  </Section>
</DashboardSettingsPage>
```

**Features**:
- Create Terminal location
- Register card reader
- View reader status
- Test reader connection
- Unregister reader

### 2. Job Details Page (Tradesperson View)

**Path**: `/dashboard/my-jobs/[jobId]`

**Update**: Add Terminal payment option for final payment

```tsx
// Add to existing job details page
{canTakeFinalPayment && (
  <PaymentMethodSelector>
    <Option value="online">Customer Pays Online</Option>
    <Option value="terminal">Take Payment on Card Reader</Option>
  </PaymentMethodSelector>
)}

{paymentMethod === 'terminal' && <TerminalPaymentFlow jobId={jobId} />}
```

**Features**:
- Toggle between online/Terminal payment
- Show Terminal payment flow when selected
- Display payment status
- Handle payment errors

### 3. Payouts Dashboard

**Path**: `/dashboard/payouts`

**Update**: Show Terminal payment transactions separately

```tsx
// Add filter for payment method
<PayoutHistory>
  <Filter>
    <Option>All Payments</Option>
    <Option>Online Payments</Option>
    <Option>Terminal Payments</Option>
  </Filter>
  
  <TransactionList>
    {transactions.map(tx => (
      <Transaction key={tx.id}>
        <PaymentMethodBadge method={tx.paymentMethod} />
        {/* ... other details ... */}
      </Transaction>
    ))}
  </TransactionList>
</PayoutHistory>
```

---

## Component Details

### 1. LocationSetupForm.tsx

**Purpose**: Allow tradesperson to create Terminal location

**API Call**: `POST /api/stripe/terminal/location`

**Form Fields**:
```tsx
interface LocationFormData {
  displayName: string       // e.g., "John Smith Plumbing"
  address: {
    line1: string          // Street address
    city: string           // City
    postalCode: string     // UK postcode
  }
}
```

**UI Flow**:
1. Show form with fields above
2. Validate postcode format (UK)
3. Submit to API
4. Show success message
5. Redirect to reader registration

**Error Handling**:
- Already has location → Show existing location
- Invalid address → Show validation errors
- API error → Show error message with retry

**Example UI**:
```
┌────────────────────────────────────────┐
│ Create Terminal Location               │
├────────────────────────────────────────┤
│ Before you can use a card reader, we   │
│ need to create a location for it.      │
│                                         │
│ Location Name *                         │
│ [John Smith Plumbing Services    ]     │
│                                         │
│ Address Line 1 *                        │
│ [123 High Street                 ]     │
│                                         │
│ City *                                  │
│ [London                          ]     │
│                                         │
│ Postcode *                              │
│ [SW1A 1AA                        ]     │
│                                         │
│ [Cancel]  [Create Location →]          │
└────────────────────────────────────────┘
```

---

### 2. ReaderRegistration.tsx

**Purpose**: Register physical card reader to account

**API Call**: `POST /api/stripe/terminal/reader`

**Form Fields**:
```tsx
interface ReaderRegistrationData {
  registrationCode: string  // 7-digit code from reader
  label: string            // Custom name for reader
}
```

**UI Flow**:
1. Show instructions to power on reader
2. Prompt for registration code (displayed on reader)
3. Ask for custom label
4. Submit to API
5. Show pairing progress
6. Show success with reader details

**Instructions to Display**:
```
Step 1: Power on your card reader
- Hold the power button for 3 seconds
- Wait for the reader to boot up

Step 2: Find registration code
- Navigate to Settings on reader
- Select "Registration"
- Note the 7-digit code displayed

Step 3: Enter code below
```

**Example UI**:
```
┌────────────────────────────────────────┐
│ Register Card Reader                   │
├────────────────────────────────────────┤
│ [📱 Reader Setup Instructions]         │
│                                         │
│ Registration Code *                     │
│ [_ _ _ - _ _ _ _]  (7 digits)         │
│                                         │
│ Reader Name *                           │
│ [John's Card Reader              ]     │
│                                         │
│ ⓘ Give your reader a memorable name    │
│                                         │
│ [Back]  [Register Reader →]            │
└────────────────────────────────────────┘
```

---

### 3. ReaderStatus.tsx

**Purpose**: Display current reader connection status

**API Call**: `GET /api/stripe/terminal/reader`

**Data to Display**:
```tsx
interface ReaderStatus {
  readerId: string
  label: string
  status: 'online' | 'offline' | 'connecting'
  deviceType: string
  serialNumber: string
  battery?: number // If available
}
```

**UI States**:
- **Online**: Green indicator, "Connected"
- **Offline**: Red indicator, "Disconnected"
- **Connecting**: Yellow indicator, "Connecting..."

**Example UI**:
```
┌────────────────────────────────────────┐
│ Card Reader Status                     │
├────────────────────────────────────────┤
│ ● Online                                │
│                                         │
│ Reader Name: John's Card Reader        │
│ Model: BBPOS WisePad 3                 │
│ Serial: WP3-123456                     │
│ Battery: 87%                           │
│                                         │
│ Last Seen: 2 minutes ago               │
│                                         │
│ [Test Connection]  [Settings]          │
└────────────────────────────────────────┘
```

---

### 4. TerminalPaymentFlow.tsx

**Purpose**: Process Terminal payment for completed job

**API Calls**:
1. `POST /api/stripe/terminal/payment-intent` - Create payment intent
2. Poll for completion or use webhook

**Props**:
```tsx
interface TerminalPaymentFlowProps {
  jobId: string
  amount: number
  onSuccess: () => void
  onError: (error: Error) => void
  onCancel: () => void
}
```

**UI Flow**:
1. **Confirm Amount Screen**
   - Show amount breakdown
   - Confirm ready to take payment
   
2. **Connecting to Reader**
   - Show spinner
   - "Connecting to [Reader Name]..."
   
3. **Present to Customer**
   - Large text: "£530.00"
   - "Present reader to customer"
   - "Customer can insert or tap card"
   
4. **Processing**
   - Show spinner
   - "Processing payment..."
   - "Do not remove card"
   
5. **Success**
   - Green checkmark
   - "Payment Successful"
   - Show receipt option
   
6. **Failure**
   - Red X
   - Error message
   - "Try Again" / "Use Online Payment" options

**Example UI - Step 3**:
```
┌────────────────────────────────────────┐
│                                         │
│           💳 £530.00                    │
│                                         │
│     Present reader to customer         │
│                                         │
│   [Card Reader Animation]              │
│                                         │
│   Customer can:                         │
│   • Insert chip card                    │
│   • Tap contactless card                │
│   • Swipe card (if chip fails)         │
│                                         │
│                                         │
│   [Cancel Payment]                      │
│                                         │
└────────────────────────────────────────┘
```

---

## Hooks

### Custom Hooks to Create

#### useTerminalStatus.ts

```typescript
export function useTerminalStatus() {
  const [hasLocation, setHasLocation] = useState(false)
  const [hasReader, setHasReader] = useState(false)
  const [readerStatus, setReaderStatus] = useState<ReaderStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Fetch Terminal status
    // Poll reader status every 30s if reader exists
  }, [])

  return {
    hasLocation,
    hasReader,
    readerStatus,
    isLoading,
    refresh: () => { /* refetch */ }
  }
}
```

#### useTerminalPayment.ts

```typescript
export function useTerminalPayment(jobId: string) {
  const [status, setStatus] = useState<PaymentStatus>('idle')
  const [error, setError] = useState<Error | null>(null)

  const initiatePayment = async () => {
    // Call POST /api/stripe/terminal/payment-intent
    // Poll for completion or listen to webhooks
  }

  const cancelPayment = async () => {
    // Call DELETE endpoint
  }

  return {
    status,
    error,
    initiatePayment,
    cancelPayment,
  }
}
```

---

## State Management

### Terminal Setup State

```typescript
type SetupStep = 
  | 'check_status'
  | 'create_location'
  | 'register_reader'
  | 'test_connection'
  | 'complete'

interface TerminalSetupState {
  currentStep: SetupStep
  location: TerminalLocation | null
  reader: TerminalReader | null
  error: Error | null
  isLoading: boolean
}
```

### Terminal Payment State

```typescript
type PaymentStatus = 
  | 'idle'
  | 'creating_intent'
  | 'connecting_reader'
  | 'waiting_for_card'
  | 'processing'
  | 'success'
  | 'failed'
  | 'cancelled'

interface TerminalPaymentState {
  status: PaymentStatus
  paymentIntentId: string | null
  amount: number
  error: Error | null
}
```

---

## API Client Functions

Create in `src/lib/api/terminal.ts`:

```typescript
// Terminal Location
export async function createTerminalLocation(data: LocationData) {
  const res = await fetch('/api/stripe/terminal/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getTerminalLocationStatus() {
  const res = await fetch('/api/stripe/terminal/location')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Terminal Reader
export async function registerTerminalReader(data: ReaderData) {
  const res = await fetch('/api/stripe/terminal/reader', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getTerminalReaderStatus() {
  const res = await fetch('/api/stripe/terminal/reader')
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// Terminal Payment
export async function createTerminalPaymentIntent(jobId: string) {
  const res = await fetch('/api/stripe/terminal/payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function cancelTerminalPaymentIntent(paymentIntentId: string) {
  const res = await fetch(
    `/api/stripe/terminal/payment-intent?paymentIntentId=${paymentIntentId}`,
    { method: 'DELETE' }
  )
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

---

## Mobile Considerations

### Responsive Design

Terminal payments are typically used on mobile:

1. **Large Touch Targets**: Buttons should be 44px+ height
2. **Readable Text**: 16px+ font size for payment amounts
3. **Vertical Layout**: Stack elements for narrow screens
4. **Prevent Sleep**: Keep screen on during payment
5. **Offline Handling**: Show clear message if connection lost

### Mobile-First Components

```tsx
// Use mobile-optimized modals
import { Sheet } from '@/components/ui/sheet' // Bottom drawer

// Large, clear CTAs
<Button size="lg" className="w-full">
  Take Payment - £530.00
</Button>

// Show connection status prominently
<div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-2">
  ● Reader Connected
</div>
```

---

## Accessibility

### ARIA Labels

```tsx
<button 
  aria-label="Take payment using card reader"
  aria-describedby="payment-amount"
>
  Take Payment
</button>

<div id="payment-amount" className="sr-only">
  Amount: £530.00
</div>
```

### Keyboard Navigation

All flows should be keyboard-navigable:
- Tab through form fields
- Enter to submit
- Escape to cancel

### Screen Reader Support

Announce payment status changes:
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {status === 'processing' && 'Processing payment, please wait'}
  {status === 'success' && 'Payment successful'}
  {status === 'failed' && 'Payment failed'}
</div>
```

---

## Testing Checklist

### Unit Tests
- [ ] LocationSetupForm validation
- [ ] ReaderRegistration code parsing
- [ ] PaymentAmount calculation
- [ ] Error message display

### Integration Tests
- [ ] Complete setup flow (location → reader → test)
- [ ] Payment flow (initiate → process → complete)
- [ ] Error handling (network errors, API errors)
- [ ] Cancel payment flow

### E2E Tests
- [ ] First-time setup wizard
- [ ] Process Terminal payment successfully
- [ ] Handle payment decline gracefully
- [ ] Offline behavior

### Manual Testing
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Test with slow network
- [ ] Test with reader disconnected
- [ ] Test payment timeout handling

---

## Implementation Timeline

### Week 1: Core Components
- Day 1-2: LocationSetupForm + ReaderRegistration
- Day 3-4: ReaderStatus + ReaderManagement
- Day 5: Testing and refinements

### Week 2: Payment Flow
- Day 1-2: TerminalPaymentFlow component
- Day 3: Payment progress and result screens
- Day 4-5: Error handling and edge cases

### Week 3: Integration
- Day 1-2: Integrate into job details page
- Day 3: Add to dashboard settings
- Day 4: Update payouts dashboard
- Day 5: End-to-end testing

### Week 4: Polish & Launch
- Day 1-2: UI/UX refinements based on feedback
- Day 3: Documentation and user guide
- Day 4: Beta testing with select users
- Day 5: Production launch

---

## Dependencies

### Required Packages

Most dependencies already installed. May need:

```json
{
  "dependencies": {
    "react-hook-form": "already installed",
    "zod": "already installed",
    "sonner": "already installed (for toasts)"
  }
}
```

### No Additional Stripe SDK Needed

Terminal payments are server-side only. No client-side Stripe Terminal SDK needed because:
- Reader connects via Bluetooth to tradesperson's phone
- Reader communicates directly with Stripe backend
- Our backend creates payment intents
- Webhooks notify us of completion

---

## Documentation to Create

### For Developers
- [ ] Component API documentation
- [ ] State machine diagrams for payment flow
- [ ] Error handling guide
- [ ] Testing guide

### For Users
- [ ] Video tutorial: Setting up card reader
- [ ] Video tutorial: Taking first payment
- [ ] FAQ page
- [ ] Troubleshooting guide

---

## Launch Strategy

### Beta Phase (Week 1-2)
- Invite 10 active tradespeople
- Provide free/subsidized readers
- Collect feedback daily
- Fix issues quickly

### Gradual Rollout (Week 3-4)
- Open to 50 more users
- Monitor success rates
- Iterate on UX based on data
- Prepare marketing materials

### Full Launch (Week 5+)
- Announce to all tradespeople
- Blog post and email campaign
- In-app promotional banner
- Monitor adoption metrics

---

## Success Metrics

### Technical Metrics
- Payment success rate: >95%
- Reader connection success: >98%
- Average payment time: <60 seconds
- Error rate: <2%

### Business Metrics
- Reader adoption: 30% of tradespeople within 3 months
- Terminal payment ratio: 20% of final payments within 6 months
- Customer satisfaction: >4.5/5 stars
- Support ticket volume: <5% of transactions

---

## Support Resources

### In-App Help
- Link to user guide
- Animated GIFs for common tasks
- Chat support for technical issues

### Self-Service
- FAQ page with search
- Video tutorials
- Troubleshooting flowchart

---

## Next Steps

1. ✅ Backend complete (this PR)
2. ⏳ Review this frontend TODO with team
3. ⏳ Assign frontend engineer
4. ⏳ Set up beta testing program
5. ⏳ Order test card readers
6. ⏳ Begin frontend development

---

**Document Status**: Implementation Guide  
**Last Updated**: 2025-10-21  
**Author**: Engineering Team  
**Estimated Effort**: 3-4 weeks frontend development
