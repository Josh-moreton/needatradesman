# Testing the Stripe Integration

## Running Production with Stripe Test Keys (Proof of Concept)

You can deploy your production server using Stripe's sandbox (test) environment to validate your integration before switching to live keys.

### Steps

1. **Get Stripe test API keys**
   - Go to Stripe Dashboard → Developers → API keys
   - Use the keys that start with `pk_test_` and `sk_test_`

2. **Set your production environment variables to use test keys**

   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...   # from Stripe CLI or Dashboard (test mode)
   ```

3. **Deploy your app with these test keys**
   - Your production server will use Stripe's sandbox environment
   - All payments, onboarding, and webhooks will work as in test mode

4. **Test using Stripe test cards and accounts**
   - Use the test card numbers (e.g., `4242 4242 4242 4242`)
   - All Stripe features will behave as in development, but on your live server

5. **When ready, switch to live keys**
   - Replace the test keys in your `.env` with the live keys from Stripe Dashboard

**Note:** Never use real customer data or expect real payouts in test mode. All transactions are simulated.

## Prerequisites

- Stripe CLI installed
- Stripe account with Connect setup
- Webhook secret and API keys in .env

## Testing with Stripe CLI

### 1. Start the webhook listener

Open a new terminal and run:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

This will forward Stripe events to your local webhook endpoint.

### 2. Testing the Tradesperson Onboarding Flow

1. **Log in as a tradesperson**
   - Navigate to `/tradesperson/dashboard/payouts`
   - Click "Set Up Payouts"
   - Complete the Stripe Connect Express onboarding form
   - Return to the application

2. **Verify the onboarding**
   - Check that the status badge shows "Verification Pending" or "Verified"
   - You should see a webhook event `account.updated` in the Stripe CLI output

### 3. Testing the Deposit Payment Flow

1. **Log in as a customer**
   - Navigate to a job with quotes/applications
   - Select an application and click "Accept & Pay Deposit"
   - Complete the Stripe Checkout form with test card number `4242 4242 4242 4242`
   - Use any future date for expiry and any 3 digits for CVC
   - Use any name and a valid-format postal code

2. **Verify the payment**
   - You should be redirected to the success URL
   - You should see a webhook event `checkout.session.completed` in the Stripe CLI output
   - The job status should update to "IN_PROGRESS"
   - The application status should update to "ACCEPTED"

## Common Test Card Numbers

- `4242 4242 4242 4242` - Successful payment
- `4000 0000 0000 0002` - Declined payment (generic decline)
- `4000 0000 0000 9995` - Declined payment (insufficient funds)
- `4000 0000 0000 3220` - 3D Secure 2 authentication required

## Troubleshooting

1. **Webhook events not received**
   - Verify the webhook secret in .env matches the one from Stripe CLI
   - Check that the webhook endpoint URL is correct
   - Ensure the Stripe CLI is running

2. **Payment failures**
   - Check the Stripe Dashboard for error messages
   - Look for error responses from the checkout session creation API
   - Verify the payment intent metadata is correctly configured
