# 🏦 Payment Module Implementation Plan (Stripe Connect)

## 🎯 Goals

- Customers pay a deposit (escrow) when accepting a job.
- Funds are held in Stripe until job completion.
- Tradespeople can onboard with Stripe Connect and add payout details.
- Full payment is taken on job completion (both parties must confirm).
- Payouts are made directly to tradespeople’s bank accounts.

---

## 1. **Stripe Connect Setup**

### a. **Platform Stripe Account**

- Ensure your Stripe account is set up for Connect (Standard or Express).
- Configure webhook endpoints for events: `account.updated`, `checkout.session.completed`, `payment_intent.succeeded`, `transfer.paid`, etc.

### b. **Environment Variables**

- Already present in .env:
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_SECRET_KEY`
- Add:
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_CONNECT_CLIENT_ID` (if using OAuth for Express/Standard)

---

## 2. **Tradesperson Onboarding (Stripe Connect Account Creation)**

### a. **Backend API**

- Create `/api/stripe/connect/onboard`:
  - Checks if user has a Stripe account ID.
  - If not, creates a Connect account (`type: "express"` recommended).
  - Generates an onboarding link via `stripe.accountLinks.create`.
  - Returns the onboarding URL.

### b. **Frontend UI**

- **Where:** Tradesperson dashboard, under "Payouts" or "Bank Details".
- **How:**  
  - ShadCN Button: "Set Up Payouts"
  - On click, call backend, redirect to Stripe onboarding.
  - Show status (pending/verified) using ShadCN Badge.

---

## 3. **Job Acceptance & Deposit Payment (Customer)**

### a. **Backend API**

- Create `/api/stripe/checkout-session`:
  - Accepts `jobId`, `depositAmount`, `customerId`, `tradespersonStripeAccountId`.
  - Creates a Stripe Checkout Session:
    - `payment_intent_data.transfer_data.destination` set to platform (not tradesperson yet).
    - `payment_intent_data.application_fee_amount` if you take a fee.
    - `payment_method_types: ['card']`
    - `mode: 'payment'`
    - `success_url` and `cancel_url` set to your app.
    - `metadata` includes job/customer/tradesperson IDs.

### b. **Frontend UI**

- **Where:** On job acceptance modal/page.
- **How:**  
  - ShadCN Modal: "Pay Deposit to Secure Your Booking"
  - Use [Stripe Elements](https://stripe.com/docs/stripe-js/react) or [Stripe Checkout](https://stripe.com/docs/payments/checkout) (recommended for PCI compliance).
  - On success, update job status to "Deposit Paid".

---

## 4. **Escrow Logic**

- Funds are held in your platform’s Stripe account (not transferred to tradesperson yet).
- Store payment intent/session IDs in your DB for reconciliation.

---

## 5. **Job Completion & Full Payment**

### a. **Completion Confirmation**

- Both customer and tradesperson must click "Mark as Complete".
- Use ShadCN Button on job detail page for both parties.
- When both have confirmed, trigger full payment.

### b. **Full Payment Flow**

- If only deposit was paid, create a new Checkout Session for the remaining amount.
- On successful payment, update job status to "Paid in Full".

---

## 6. **Releasing Funds to Tradesperson**

### a. **Backend API**

- When job is fully paid and both parties have confirmed:
  - Use `stripe.transfers.create` to send funds from your platform to the tradesperson’s Connect account.
  - Optionally, deduct your platform fee.

### b. **Frontend UI**

- **Where:** Tradesperson dashboard, "Payouts" section.
- **How:**  
  - ShadCN Card: "Payout Status"
  - Show payout status, amount, and expected arrival.

---

## 7. **Webhooks**

- Implement `/api/stripe/webhook` to handle:
  - `checkout.session.completed`: Mark deposit/full payment as paid.
  - `transfer.paid`: Mark payout as complete.
  - `account.updated`: Update tradesperson onboarding status.

---

## 8. **UI/UX Integration Points**

| Feature                        | Page/Component                        | UI Type         |
|------------------------------- |-------------------------------------- |-----------------|
| Tradesperson onboarding        | `/tradesperson/dashboard/payouts`     | ShadCN Button, Badge, Card |
| Deposit payment (customer)     | `/customer/jobs/[jobId]`              | ShadCN Modal, Stripe Checkout |
| Job completion confirmation    | `/customer/jobs/[jobId]`, `/tradesperson/jobs/[jobId]` | ShadCN Button |
| Payout status                  | `/tradesperson/dashboard/payouts`     | ShadCN Card, Badge |
| Payment history                | `/customer/dashboard/payments`        | ShadCN Table/Card |

---

## 9. **Step-by-Step User Flow**

### **A. Tradesperson Onboarding**

1. Tradesperson visits "Payouts" page.
2. Clicks "Set Up Payouts" (ShadCN Button).
3. Redirected to Stripe onboarding.
4. On return, status shown (pending/verified).

### **B. Customer Accepts Job**

1. Customer clicks "Accept & Pay Deposit" on job detail.
2. ShadCN Modal opens, launches Stripe Checkout.
3. On success, job status updates to "Deposit Paid".

### **C. Job Completion**

1. Both customer and tradesperson see "Mark as Complete" button.
2. When both have clicked, trigger full payment (if not already paid).
3. On payment success, trigger payout to tradesperson.

### **D. Payout**

1. Tradesperson sees payout status in dashboard.
2. Funds arrive in their bank account via Stripe.

---

## 10. **Security & Compliance**

- Use Stripe Checkout or Elements for all card entry.
- Never store card or bank details on your server.
- Use webhooks to verify all payment and payout events.

---

## 11. **Next Steps**

- [ ] Implement Stripe Connect onboarding API and UI.
- [ ] Build deposit payment flow with Stripe Checkout.
- [ ] Add job completion confirmation logic.
- [ ] Implement payout release logic and UI.
- [ ] Set up Stripe webhooks for all relevant events.
- [ ] Add payment and payout status indicators in dashboards.

Information:Snapshot payload:
{
"id":
"evt_abc123xyz",
"object":
"event",
"api_version":
"2019-02-19",
"created":
1686089970,
"data": {… 1 item},
"livemode":
false,
"pending_webhooks":
0,
"request": {… 2 items},
"type":
"setup_intent.created",
}

thin payload:

{
"id":
"evt_abc123xyz",
"object":
"v2.core.event",
"type":
"v1.billing.meter.error_report_triggered",
"livemode":
false,
"created":
"2024-09-17T06:20:52.246Z",
"related_object": {
"id":
"mtr_test_123456789",
"type":
"billing.meter",
"url":
"/v1/billing/meters/mtr_test_123456789",
