# Stripe Capital Integration for NeedaTradesman Academy

## Overview

This integration enables tradespeople on the NeedaTradesman platform to access Stripe Capital financing to fund their professional training and qualifications through the NeedaTradesman Academy.

## What is Stripe Capital?

Stripe Capital provides eligible businesses with access to flexible financing based on their payment processing history. For NeedaTradesman, this allows tradespeople who have been actively using the platform to:

- Access funding for professional qualifications and training
- Repay automatically from future earnings on the platform
- Scale repayments based on business activity (no fixed monthly payments)

## Architecture

### API Endpoints

#### GET `/api/stripe/capital/offers`

Retrieves Stripe Capital financing information for the authenticated tradesperson.

**Authentication:** Required (Clerk)  
**Authorization:** TRADESPERSON role only

**Response:**
```json
{
  "hasAccount": true,
  "onboarded": true,
  "eligible": true,
  "capitalEnabled": true,
  "dashboardUrl": "https://connect.stripe.com/...",
  "summary": {
    "available_amount": 5000,
    "currency": "gbp"
  }
}
```

**Error Codes:**
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (not a tradesperson)
- `404` - User not found
- `400` - Stripe account not set up or not onboarded
- `500` - Server error

### UI Components

#### Academy Page (`/academy`)

The main Academy page displays:
1. Available courses and training programs
2. Stripe Capital financing options (if eligible)
3. Course details with pricing
4. Links to Stripe Dashboard for Capital applications

**Key Features:**
- Shows Capital eligibility status
- Explains how Capital financing works
- Displays available courses with pricing
- Links to Stripe Dashboard for full offer details

#### Dashboard Widget

Tradesperson dashboard includes a new "Academy" card that:
- Links to the Academy page
- Encourages professional development
- Makes training accessible from the main dashboard

## How It Works

### For Tradespeople

1. **Eligibility Check**
   - Tradesperson must have a fully onboarded Stripe Connect account
   - Eligibility determined by Stripe based on payment history
   - Geographic availability (currently UK, US, and other supported regions)

2. **Viewing Offers**
   - Visit `/academy` page
   - System checks eligibility via API
   - If eligible, displays Capital financing card with dashboard link

3. **Applying for Capital**
   - Click "View Financing Offers" button
   - Redirected to Stripe Dashboard login
   - View detailed offers and apply directly through Stripe
   - Stripe handles all underwriting and approval

4. **Using Capital for Training**
   - Once approved, funds can be used for Academy courses
   - Courses show "Financing available through Stripe Capital" badge
   - Future: Direct integration for course purchases

5. **Repayment**
   - Fixed percentage automatically withheld from platform earnings
   - No fixed monthly payments - scales with business activity
   - Managed entirely through Stripe Connect

### For the Platform

**Capital Eligibility Criteria (managed by Stripe):**
- Active Stripe Connect Express account
- Sufficient payment processing history
- Good account standing
- Geographic availability

**Platform Benefits:**
- Increased tradesperson engagement
- Higher qualification levels among tradespeople
- Improved service quality for customers
- Revenue from course sales

## Technical Implementation

### Stripe Connect Integration

The Capital integration leverages our existing Stripe Connect implementation:

```typescript
// Check eligibility
const account = await stripe.accounts.retrieve(stripeAccountId);

// Capital summary is on the account object
const capitalSummary = account.capital_financing_summary;

// Generate dashboard login link
const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
```

### Security Considerations

1. **Authentication**: Clerk auth required for all endpoints
2. **Authorization**: Only tradespeople can access Capital APIs
3. **Account Verification**: Validates Stripe account status before showing offers
4. **No Sensitive Data**: Never store Capital offer details locally
5. **Stripe Dashboard**: All application and offer details handled by Stripe

### Data Flow

```
User Request → Auth Check → User Lookup → 
Stripe Account Check → Capital Eligibility Check → 
Dashboard Link Generation → Response
```

## Environment Variables

No new environment variables required. Uses existing Stripe configuration:

```bash
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

## Testing

### Manual Testing

1. **Test as Tradesperson:**
   ```bash
   # Login as tradesperson with Stripe account
   # Navigate to /academy
   # Verify Capital card displays (if eligible)
   # Click dashboard link and verify redirect
   ```

2. **Test as Customer:**
   ```bash
   # Login as customer
   # Navigate to /academy
   # Verify no Capital card (customers don't get financing)
   ```

3. **Test Without Stripe Account:**
   ```bash
   # Login as tradesperson without Stripe setup
   # Navigate to /academy
   # Verify setup prompt displays
   ```

### Stripe Test Mode

Capital offers are only available in live mode. In test mode:
- API returns no offers
- UI gracefully handles empty state
- Dashboard links still work but show test mode data

## Limitations & Future Enhancements

### Current Limitations

1. **Manual Process**: Tradespeople must apply through Stripe Dashboard
2. **No Direct Integration**: Cannot automatically use Capital for course purchases
3. **Limited Visibility**: Cannot see offer details without Stripe login
4. **Test Mode**: Capital not available in Stripe test mode

### Future Enhancements

1. **Direct Purchase Integration**
   - Use Capital directly for course checkout
   - One-click financing approval
   - Automated fund disbursement

2. **Offer Display**
   - Show offer amounts on platform
   - Display repayment terms
   - Track Capital usage

3. **Course Completion Tracking**
   - Link Capital usage to specific courses
   - Display certifications on tradesperson profiles
   - ROI tracking for tradespeople

4. **Advanced Features**
   - Installment plans for courses
   - Bulk training purchases
   - Partner training provider integrations

## Support & Troubleshooting

### Common Issues

**Q: I'm not seeing Capital offers**  
A: Capital eligibility is determined by Stripe based on your payment history. You need:
- Fully onboarded Stripe Connect account
- Sufficient transaction history on the platform
- Good account standing

**Q: Dashboard link not working**  
A: The login link expires after a short time. Refresh the Academy page to generate a new link.

**Q: Can customers access Capital?**  
A: No, Capital is only available to tradespeople with Stripe Connect accounts.

**Q: How do I check my Capital balance?**  
A: Login to your Stripe Dashboard using the link provided on the Academy page.

### Support Resources

- [Stripe Capital Documentation](https://stripe.com/docs/capital)
- [Stripe Connect Express Accounts](https://stripe.com/docs/connect/express-accounts)
- Platform support: `/dashboard/support`

## Monitoring

### Metrics to Track

1. **Engagement**
   - Academy page visits by tradespeople
   - Capital card click-through rate
   - Dashboard login conversions

2. **Eligibility**
   - Percentage of tradespeople eligible for Capital
   - Average time to eligibility
   - Eligibility by region

3. **Usage**
   - Capital applications initiated
   - Capital approved amounts
   - Course purchases using Capital (future)

### Analytics Events

```typescript
// Track Capital card views
analytics.track('capital_card_viewed', {
  eligible: true,
  tradesperson_id: user.id
});

// Track dashboard clicks
analytics.track('capital_dashboard_clicked', {
  tradesperson_id: user.id
});
```

## Related Documentation

- [Main Payments Documentation](./payments/README.md)
- [Stripe Connect Setup](./payments/stripe-connect-audit-report.md)
- [Academy Course Management](./academy/courses.md) (future)

---

**Last Updated:** 2025-10-20  
**Version:** 1.0  
**Status:** Live  
**Owner:** Platform Team
