# Stripe Terminal User Guide for Tradespeople

## What is Stripe Terminal?

Stripe Terminal allows you to accept card payments in person using either:
1. **Tap to Pay on iPhone** - Your iPhone becomes a card reader (FREE, no hardware needed)
2. **Physical card readers** - Dedicated hardware devices for accepting cards

This means you can take final payment from your customers on-site when you complete a job, without having to wait for them to pay online later.

## Benefits

✅ **Get Paid Immediately**: Collect payment on-site when the job is done  
✅ **Professional Experience**: Secure payment acceptance at customer location  
✅ **Customer Convenience**: Customers can pay with contactless cards or digital wallets  
✅ **Platform Security**: All payments flow through the platform maintaining security  
✅ **Same Fee Structure**: Same platform fees as online payments  
✅ **Flexible Options**: Choose Tap to Pay (free) or physical readers

## Payment Options

### Option 1: Tap to Pay on iPhone (Recommended for iPhone Users)

**What is it?**
Your iPhone XS or newer becomes a contactless payment terminal - no physical hardware needed! Customers tap their card or phone on your iPhone to pay.

**Benefits**:
- ✅ **FREE** - No hardware to purchase
- ✅ **Always with you** - Can't forget or lose it
- ✅ **Instant setup** - Start accepting payments immediately
- ✅ **Same security** - PCI-compliant and encrypted

**Requirements**:
- iPhone XS or newer
- iOS 15.4 or later
- Completed Stripe Connect onboarding

**Limitations**:
- Contactless payments only (no chip & PIN)
- Typically £100 transaction limit
- iOS only

**Best for**: Tradespeople who already own compatible iPhones and want zero hardware costs

### Option 2: Physical Card Readers

#### BBPOS WisePad 3 (Recommended Physical Reader)

- **Price**: £59 (or request from platform)
- **Connectivity**: Bluetooth (connects to your smartphone)
- **Battery**: Up to 500 transactions per charge
- **Payment Methods**: Chip, contactless (tap), AND swipe
- **Security**: PCI-DSS certified, end-to-end encryption

**Benefits over Tap to Pay**:
- ✅ Accepts chip & PIN (not just contactless)
- ✅ No transaction limits from contactless
- ✅ Works with any smartphone (iOS or Android)
- ✅ Dedicated device - no battery drain on personal phone

**Best for**: Tradespeople who need chip & PIN support, work with Android phones, or prefer dedicated hardware

## Getting Started

### Step 1: Complete Stripe Connect Onboarding

Before you can use a card reader, you need to have completed your Stripe Connect onboarding:

1. Go to **Dashboard** → **Payouts**
2. Click **"Set Up Payouts"**
3. Complete the Stripe onboarding form
4. Wait for verification (usually 1-2 business days)

### Step 2: Choose Your Payment Method

#### Setup Path A: Tap to Pay on iPhone (FREE)

**Requirements Check**:
- ✅ iPhone XS or newer
- ✅ iOS 15.4 or later
- ✅ Stripe Connect onboarding complete

**Setup Steps**:
1. Go to **Dashboard** → **Payments** → **Tap to Pay**
2. Click **"Enable Tap to Pay on iPhone"**
3. Follow iOS permissions prompts:
   - Allow Stripe Terminal SDK access
   - Enable NFC (contactless) permissions
4. Create Terminal location (see Step 3 below)
5. Test with a small transaction
6. ✅ Ready to accept payments!

**Setup Time**: 5 minutes

#### Setup Path B: Physical Card Reader (BBPOS WisePad 3)

**Option 1: Request from Platform**
1. Go to **Dashboard** → **Payments** → **Card Reader**
2. Click **"Request Card Reader"**
3. Provide your shipping address
4. Pay £50 refundable deposit (refunded when reader returned)
5. Reader ships in 2-3 business days

**Option 2: Purchase Direct from Stripe**
1. Visit [Stripe Terminal Store](https://stripe.com/terminal/readers)
2. Purchase BBPOS WisePad 3
3. Have registration code ready for setup

### Step 3: Set Up Your Terminal Location

Before you can use Tap to Pay or pair a reader, you need to create a Terminal location:

1. Go to **Dashboard** → **Payments** → **Terminal Setup**
2. Click **"Create Location"**
3. Enter:
   - Location name (e.g., "John Smith Services")
   - Address line 1
   - City
   - Postcode
4. Click **"Create Location"**

### Step 4A: Using Tap to Pay on iPhone (No Further Setup Needed!)

If you chose Tap to Pay, you're done! Skip to "Taking Payments" section below.

### Step 4B: Pair Your Physical Card Reader

Only if you chose a physical card reader:

1. Unbox your card reader and charge it fully
2. Power on the reader (hold power button for 3 seconds)
3. In the app, click **"Register Card Reader"**
4. Follow the on-screen instructions:
   - Turn on Bluetooth on your phone
   - Find the registration code on your reader's screen
   - Enter the code in the app
   - Give your reader a name (e.g., "John's Reader")
5. Wait for pairing to complete (30-60 seconds)
6. Test with a dummy transaction

## Taking Payments

### When to Use Terminal vs Online Payment

**Use Terminal when:**
- ✅ You're physically with the customer
- ✅ The job is completed and confirmed
- ✅ Customer prefers to pay on-site
- ✅ Faster payment settlement needed

**Use Online when:**
- ✅ You're not physically with customer
- ✅ Customer prefers to pay later
- ✅ Payment for deposit (before job starts)

### Step-by-Step: Processing a Terminal Payment

#### Using Tap to Pay on iPhone

1. **Complete the Job**
   - Finish the work as agreed
   - Both you and customer confirm completion in the app

2. **Open the Job**
   - Go to **My Jobs** → select the completed job

3. **Initiate Payment**
   - Click **"Take Payment with Tap to Pay"**
   - Verify the amount (should show remaining balance + platform fee)
   - Click **"Continue"**

4. **Prepare Your iPhone**
   - Hold your iPhone ready
   - App will show "Ready for Payment" screen
   - Contactless icon appears

5. **Customer Pays**
   - Ask customer to hold their contactless card or phone near the top of your iPhone
   - Wait for the tap animation and success sound
   - iPhone shows "Payment Approved" or error message

6. **Payment Complete**
   - Both parties receive receipt via email
   - Job automatically marked as completed and paid
   - Funds transferred to your Stripe account (minus platform fee)

**Important Notes**:
- Customer must use contactless card or digital wallet
- Hold card/phone within 2cm of iPhone top edge
- Transaction limit: typically £100 (contactless limit)
- For amounts over £100, customer may need alternative payment method

#### Using Physical Card Reader (BBPOS WisePad 3)

1. **Complete the Job**
   - Finish the work as agreed
   - Both you and customer confirm completion in the app

2. **Open the Job**
   - Go to **My Jobs** → select the completed job

3. **Initiate Payment**
   - Click **"Take Payment on Card Reader"**
   - Verify the amount (should show remaining balance + platform fee)
   - Click **"Continue"**

4. **Prepare Reader**
   - Wake up your card reader if it's asleep
   - Wait for reader to connect (shows on screen)

5. **Customer Pays**
   - Hand the reader to your customer
   - They can:
     - **Tap** their contactless card
     - **Insert** chip card and enter PIN
     - **Swipe** if chip fails (rare)
   - Reader shows "Approved" or "Declined"

6. **Payment Complete**
   - Both parties receive receipt via email
   - Job automatically marked as completed and paid
   - Funds transferred to your Stripe account (minus platform fee)

### Payment Amounts

The customer pays:
- **Remaining balance** (full quote minus deposit already paid)
- **+ 6% platform fee** (on remaining balance)

You receive:
- **Remaining balance minus 4% platform fee**

**Example:**
- Quote: £1,000
- Deposit paid: £500 (50%)
- Remaining balance: £500

Customer pays on Terminal:
- £500 + (£500 × 6%) = £530

You receive:
- £500 - (£500 × 4%) = £480

Platform collects:
- £30 + £20 = £50 (10% total)

## Troubleshooting

### Tap to Pay on iPhone Issues

#### iPhone Not Accepting Payments
1. Check iOS version (need 15.4+)
2. Verify Stripe Terminal permissions in iOS Settings
3. Ensure NFC is enabled (Settings → General → NFC)
4. Check internet connection
5. Restart the app

#### "Contactless Not Available" Error
- **Solution**: Your iPhone model may not support Tap to Pay (need iPhone XS+)
- **Alternative**: Use physical card reader or online payment

#### Card Tap Not Detected
1. Ensure customer holds card within 2cm of iPhone top edge
2. Remove any thick phone case that might block NFC
3. Try different position/angle
4. Ask customer to try different card

#### Transaction Over Limit
- **Contactless limit**: Typically £100
- **Solution**: Customer needs to:
  - Use chip & PIN with physical reader instead
  - Pay online through the platform
  - Split payment if possible

### Physical Card Reader Issues

#### Reader Won't Turn On
- **Solution**: Charge the reader using the USB-C cable provided
- **Charging time**: 2-3 hours for full charge
- **Battery indicator**: LED lights show charging status

#### Reader Won't Pair
1. Check Bluetooth is enabled on your phone
2. Make sure you're within 30 feet of the reader
3. Restart the reader (hold power button for 10 seconds)
4. Restart the pairing process in the app
5. If still failing, contact support

### General Payment Issues

#### Payment Declined
- **Card declined**: Ask customer to use a different card
- **Insufficient funds**: Customer needs to use another payment method
- **Card expired**: Customer should use a valid card
- **System error**: Try again or fall back to online payment

#### No Internet Connection
- **Tap to Pay**: Requires active internet - wait until connected
- **Physical reader**: Bluetooth reader also needs internet on phone
- **Fallback**: Collect payment online later

#### Reader Shows "Offline" (Physical Readers Only)
1. Check your phone has internet connection
2. Ensure Bluetooth is enabled
3. Restart reader and try again
4. Check reader battery level

#### Reader Lost or Stolen (Physical Readers Only)
1. Immediately report to platform support
2. We'll remotely deactivate the reader
3. You'll receive a replacement (deposit may be charged if not returned)

## Maintenance

### Daily
- ✅ Charge reader overnight
- ✅ Keep reader clean with soft, dry cloth
- ✅ Store in protective case when not in use

### Weekly
- ✅ Test reader with a small transaction
- ✅ Update reader software if prompted

### Monthly
- ✅ Check reader for physical damage
- ✅ Review payment success rate in dashboard

## Card Reader Care

**DO:**
- ✅ Keep reader charged
- ✅ Store in protective case
- ✅ Clean with soft, dry cloth
- ✅ Keep reader software updated
- ✅ Report issues promptly

**DON'T:**
- ❌ Expose to water or liquids
- ❌ Drop or throw the reader
- ❌ Use harsh chemicals to clean
- ❌ Leave in extreme temperatures
- ❌ Attempt to repair yourself

## Fees

### Card Reader Deposit
- **£50 refundable** (if you request reader from platform)
- Refunded when reader is returned in good condition
- Charged if reader lost, stolen, or damaged

### Transaction Fees
Same as online payments:
- Platform fee: 10% total (6% customer + 4% tradesperson)
- Stripe processing: 1.5% + 20p per transaction

### No Hidden Fees
- ✅ No monthly subscription
- ✅ No minimum transactions
- ✅ No setup fees
- ✅ No contract or commitment

## Returning Your Reader

If you no longer need the reader:

1. Contact support to request return
2. We'll email you a prepaid return label
3. Pack reader securely in original box (if available)
4. Drop off at post office
5. Deposit refunded within 5 business days after inspection

**Inspection checks:**
- Reader powers on
- Screen intact
- No physical damage
- All accessories included (cable, case)

## Support

### In-App Help
- Click **Help** icon in card reader settings
- View FAQs and video tutorials
- Chat with support team

### Emergency Support
- Phone: Available during business hours
- Email: Available 24/7 (response within 4 hours)

### Common Questions

**Q: Can I use the reader offline?**
A: No, internet connection required to process payments

**Q: What if customer disputes payment?**
A: Same dispute process as online payments, handled by Stripe

**Q: Can I use reader for other businesses?**
A: No, reader is linked to your Need A Tradesman account only

**Q: How many payments can I process per day?**
A: Unlimited (based on battery - ~500 transactions per charge)

**Q: Can customers pay with Apple Pay/Google Pay?**
A: Yes, via contactless (tap) on the reader

**Q: Do I need mobile signal?**
A: Yes, phone needs internet (WiFi or mobile data)

**Q: Can I refund a Terminal payment?**
A: Yes, same refund process as online payments through dashboard

## Best Practices

### Before Starting a Job
1. ✅ Charge your reader fully
2. ✅ Test reader connection in the app
3. ✅ Ensure you have internet on your phone

### During Payment
1. ✅ Explain the amount to customer clearly
2. ✅ Show payment breakdown if customer asks
3. ✅ Hand reader to customer (don't enter card details yourself)
4. ✅ Wait for "Approved" on screen
5. ✅ Offer receipt (sent via email automatically)

### After Payment
1. ✅ Thank customer for payment
2. ✅ Confirm they received email receipt
3. ✅ Mark job as complete in app
4. ✅ Charge reader for next job

## Security & Privacy

### PCI Compliance
- All card data encrypted end-to-end
- No card numbers stored on your phone or our servers
- Stripe-certified readers maintain highest security standards

### Customer Privacy
- Card details never visible to you
- Transaction receipts sent automatically
- All data protected under UK GDPR

### Fraud Prevention
- Chip and PIN verification
- Contactless payments under £100 (no PIN)
- Real-time fraud detection by Stripe

## Frequently Asked Questions

**Q: What happens if payment fails?**
A: Customer can try another card or pay online later. Job remains in "awaiting payment" status.

**Q: Can I take deposit payments on Terminal?**
A: No, deposits must be paid online. Only final payments can be taken on Terminal.

**Q: What if I lose the reader?**
A: Report immediately. We deactivate it remotely. Replacement reader issued (deposit charged).

**Q: Do I pay VAT on the card reader?**
A: No, readers provided by platform are VAT-exempt as part of the service.

**Q: Can I use my own card reader?**
A: No, must use reader registered to our platform for security and compliance.

---

## Quick Start Checklist

- [ ] Complete Stripe Connect onboarding
- [ ] Order/receive card reader
- [ ] Create Terminal location in app
- [ ] Charge reader fully
- [ ] Pair reader with app
- [ ] Test with small transaction
- [ ] Ready to accept payments!

**Need Help?** Contact support via in-app chat or email support@needatradesman.com

---

**Last Updated**: 2025-10-21  
**Version**: 1.0
