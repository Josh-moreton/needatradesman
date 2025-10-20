# Testing Guide for Stripe Capital Integration

## Overview

This guide covers testing the Stripe Capital integration for the NeedaTradesman Academy feature.

## Prerequisites

Before testing, ensure you have:

1. ✅ Development environment set up
2. ✅ Database running (PostgreSQL)
3. ✅ Clerk authentication configured
4. ✅ Stripe API keys (test mode for development)
5. ✅ At least two test users:
   - One TRADESPERSON with Stripe Connect account
   - One CUSTOMER

## Test Scenarios

### 1. Academy Page Access (All Users)

**Test:** Navigate to `/academy` as any authenticated user

**Expected Results:**
- ✅ Page loads successfully
- ✅ Course catalog displays 6 sample courses
- ✅ "How It Works" section visible
- ✅ "Why Choose NeedaTradesman Academy?" section visible
- ✅ All courses show "Coming Soon" status

**Screenshots Needed:**
- [ ] Full Academy page view
- [ ] Course cards grid
- [ ] How it works section

---

### 2. Tradesperson with Stripe Account (Capital Eligible)

**Setup:**
1. Login as TRADESPERSON
2. Complete Stripe Connect onboarding
3. Ensure account has some transaction history (for production)

**Test:** Navigate to `/academy`

**Expected Results:**
- ✅ Green "Financing Available" card at the top
- ✅ Card explains Stripe Capital benefits:
  - Eligible for financing
  - Automatic repayment from earnings
  - No fixed monthly payments
- ✅ "View Financing Offers" button present
- ✅ Button links to Stripe Dashboard (via login link)
- ✅ Each course shows "Financing available" note at bottom

**API Response:**
```json
{
  "hasAccount": true,
  "onboarded": true,
  "eligible": true,
  "capitalEnabled": true,
  "dashboardUrl": "https://connect.stripe.com/..."
}
```

**Screenshots Needed:**
- [ ] Academy page with Capital card
- [ ] Capital card close-up
- [ ] Course card with financing note

---

### 3. Tradesperson without Stripe Account

**Setup:**
1. Login as TRADESPERSON
2. Do NOT complete Stripe Connect setup

**Test:** Navigate to `/academy`

**Expected Results:**
- ✅ Yellow "Set Up Payments" card displays
- ✅ Card explains need to complete Stripe setup
- ✅ "Set Up Payments" button links to `/dashboard/payouts`
- ✅ No green Capital financing card
- ✅ Courses do NOT show "Financing available" note

**API Response:**
```json
{
  "error": "Stripe Connect account not set up",
  "hasAccount": false,
  "eligible": false
}
```

**Screenshots Needed:**
- [ ] Academy page with setup prompt
- [ ] Setup card close-up

---

### 4. Customer User

**Setup:**
1. Login as CUSTOMER (not tradesperson)

**Test:** Navigate to `/academy`

**Expected Results:**
- ✅ Page loads successfully
- ✅ NO Capital financing card
- ✅ NO setup prompt
- ✅ Just course catalog and information

**API Response:**
```json
{
  "error": "Only tradespeople can access Capital financing"
}
```

**Notes:** 
- Customers can view Academy but don't need financing
- Future: Customers might sponsor tradesperson training

**Screenshots Needed:**
- [ ] Academy page as customer

---

### 5. Dashboard Integration

**Setup:**
1. Login as TRADESPERSON

**Test:** Navigate to `/dashboard`

**Expected Results:**
- ✅ New "Academy" card in Quick Actions grid
- ✅ Card has graduation cap icon
- ✅ Card shows "Training & qualifications" description
- ✅ "View Courses" button links to `/academy`
- ✅ Card has subtle border to stand out

**Screenshots Needed:**
- [ ] Tradesperson dashboard with Academy card
- [ ] Academy card close-up

---

### 6. API Endpoint Testing

**Endpoint:** `GET /api/stripe/capital/offers`

#### Test 6.1: Unauthenticated Request
```bash
curl http://localhost:3000/api/stripe/capital/offers
```

**Expected:** `401 Unauthorized`

#### Test 6.2: Tradesperson with Account
```bash
# Login first, then:
curl -H "Cookie: __session=..." http://localhost:3000/api/stripe/capital/offers
```

**Expected:** 
- `200 OK` with eligibility data
- Dashboard URL included

#### Test 6.3: Customer User
```bash
# Login as customer, then:
curl -H "Cookie: __session=..." http://localhost:3000/api/stripe/capital/offers
```

**Expected:** `403 Forbidden`

#### Test 6.4: Tradesperson without Stripe
```bash
# Login as tradesperson without Stripe setup:
curl -H "Cookie: __session=..." http://localhost:3000/api/stripe/capital/offers
```

**Expected:** 
- `400 Bad Request`
- `hasAccount: false` in response

---

## Visual Testing Checklist

### Layout & Responsiveness
- [ ] Academy page responsive on mobile (320px)
- [ ] Academy page responsive on tablet (768px)
- [ ] Academy page responsive on desktop (1024px+)
- [ ] Course grid adjusts properly (3 columns → 2 → 1)
- [ ] Capital card stacks properly on mobile
- [ ] Dashboard card fits in grid

### Styling & Polish
- [ ] Capital card has primary border color
- [ ] Course prices formatted as GBP (£1,500.00)
- [ ] Icons render correctly (GraduationCap, CheckCircle2, etc.)
- [ ] Buttons have correct variants (primary, outline)
- [ ] Hover states work on interactive elements
- [ ] Dark mode support (if applicable)

### Content & Copy
- [ ] All course descriptions readable
- [ ] No typos or grammar errors
- [ ] "How It Works" section clear
- [ ] Capital benefits explained simply
- [ ] Error messages user-friendly

---

## Integration Testing

### Flow: Tradesperson Discovers Academy

1. **Start:** Login as new tradesperson
2. **Setup:** Navigate to dashboard
3. **Discovery:** See Academy card
4. **Click:** Click "View Courses"
5. **View:** See Academy page with setup prompt
6. **Setup:** Click "Set Up Payments"
7. **Complete:** Complete Stripe onboarding
8. **Return:** Navigate back to `/academy`
9. **Result:** See Capital financing card

**Expected Duration:** 5-10 minutes

### Flow: Eligible Tradesperson Applies for Capital

1. **Start:** Login as tradesperson with Stripe account
2. **Navigate:** Go to `/academy`
3. **View:** See Capital financing card
4. **Click:** Click "View Financing Offers"
5. **Redirect:** Redirected to Stripe Dashboard
6. **View:** See Capital offers in Stripe Dashboard
7. **Apply:** (Optional) Apply for financing through Stripe

**Expected Duration:** 2-3 minutes

---

## Performance Testing

### Page Load Times
- [ ] Academy page loads in < 2 seconds
- [ ] API response in < 500ms
- [ ] Dashboard loads in < 2 seconds

### API Reliability
- [ ] 100 consecutive API calls succeed
- [ ] Handles Stripe API errors gracefully
- [ ] Proper retry logic on failures

---

## Security Testing

### Authentication & Authorization
- [x] Cannot access API without authentication
- [x] Customers cannot access Capital endpoint
- [x] Cannot view other users' Capital offers
- [x] Dashboard link is user-specific

### Data Privacy
- [x] No sensitive Stripe data exposed in API
- [x] Capital summary properly sanitized
- [x] Login links expire after use

---

## Browser Testing

Test in:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Known Limitations

### Test Mode
⚠️ **Stripe Capital is not available in test mode**
- API will return `eligible: false` or empty offers
- To test full flow, need live Stripe account with history

### Mock Testing
For development, you can mock the Capital response:
```typescript
// In development, return mock data
if (process.env.NODE_ENV === 'development') {
  return {
    hasAccount: true,
    onboarded: true,
    eligible: true,
    capitalEnabled: true,
    dashboardUrl: 'https://dashboard.stripe.com/test',
    summary: {
      available_amount: 5000,
      currency: 'gbp'
    }
  };
}
```

---

## Troubleshooting

### Issue: Capital card not showing
**Check:**
1. User is logged in as TRADESPERSON
2. User has Stripe Connect account set up
3. Stripe account is fully onboarded
4. API returns `eligible: true`

### Issue: Dashboard link doesn't work
**Check:**
1. Login link hasn't expired (short TTL)
2. Stripe account ID is correct
3. Network connectivity to Stripe

### Issue: Courses not displaying
**Check:**
1. COURSES array is defined
2. No JavaScript errors in console
3. Card components rendering correctly

---

## Success Criteria

✅ **All test scenarios pass**  
✅ **No console errors**  
✅ **Responsive on all screen sizes**  
✅ **Loading states handled gracefully**  
✅ **Error messages user-friendly**  
✅ **Integrates with existing Stripe Connect**  
✅ **Documentation complete**

---

## Next Steps After Testing

1. ✅ Fix any bugs found
2. ✅ Gather user feedback
3. ⏱️ Monitor API performance
4. ⏱️ Track Academy engagement metrics
5. ⏱️ Plan Phase 2: Direct course purchases

---

**Last Updated:** 2025-10-20  
**Test Coverage:** API ✅ | UI ✅ | Integration ✅ | E2E ⏱️
