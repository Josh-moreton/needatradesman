import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing Stripe secret key')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-09-30.clover', // Latest API version for Stripe SDK v19
    typescript: true,
})

export const STRIPE_CONFIG = {
    currency: 'gbp',
    // Platform commission - split between customer and tradesperson (Airbnb-style)
    // Customer pays: quote + 6% platform fee
    // Tradesperson receives: quote - 4% platform fee
    // Total platform commission: 10% (4% + 6%)
    platformFeePercentage: 10, // Total combined fee (kept for backward compatibility)
    customerFeePercentage: 6,  // Fee paid by customer on top of quote
    tradespersonFeePercentage: 4, // Fee deducted from tradesperson's payout
} as const

/**
 * Calculate platform fee for a given amount (legacy - total 10%)
 * @param amount Amount in GBP (pounds)
 * @returns Platform fee in pence (smallest currency unit)
 * @deprecated Use calculateCustomerFee and calculateTradespersonFee for split commission model
 */
export function calculatePlatformFee(amount: number): number {
    const amountInPence = Math.round(amount * 100)
    const platformFee = Math.round(amountInPence * (STRIPE_CONFIG.platformFeePercentage / 100))
    return platformFee
}

/**
 * Calculate the customer's platform fee (6% on top of quote)
 * @param quoteAmount Quote amount in GBP (pounds)
 * @returns Customer fee in pence
 */
export function calculateCustomerFee(quoteAmount: number): number {
    const amountInPence = Math.round(quoteAmount * 100)
    const customerFee = Math.round(amountInPence * (STRIPE_CONFIG.customerFeePercentage / 100))
    return customerFee
}

/**
 * Calculate the tradesperson's platform fee (4% deducted from quote)
 * @param quoteAmount Quote amount in GBP (pounds)
 * @returns Tradesperson fee in pence (amount to deduct from their payout)
 */
export function calculateTradespersonFee(quoteAmount: number): number {
    const amountInPence = Math.round(quoteAmount * 100)
    const tradespersonFee = Math.round(amountInPence * (STRIPE_CONFIG.tradespersonFeePercentage / 100))
    return tradespersonFee
}

/**
 * Calculate the total amount customer pays (quote + customer fee)
 * @param quoteAmount Quote amount in GBP (pounds)
 * @returns Total customer payment in pence
 */
export function calculateCustomerTotal(quoteAmount: number): number {
    const amountInPence = Math.round(quoteAmount * 100)
    const customerFee = calculateCustomerFee(quoteAmount)
    return amountInPence + customerFee
}

/**
 * Calculate the net amount tradesperson receives after platform fee
 * @param amount Total amount in GBP (pounds)
 * @returns Net amount tradesperson receives in pence
 */
export function calculateTradespersonAmount(amount: number): number {
    const amountInPence = Math.round(amount * 100)
    const platformFee = calculatePlatformFee(amount)
    return amountInPence - platformFee
}

/**
 * Calculate the net payout tradesperson receives (quote - tradesperson fee)
 * @param quoteAmount Quote amount in GBP (pounds)
 * @returns Net payout to tradesperson in pence
 */
export function calculateTradespersonPayout(quoteAmount: number): number {
    const amountInPence = Math.round(quoteAmount * 100)
    const tradespersonFee = calculateTradespersonFee(quoteAmount)
    return amountInPence - tradespersonFee
}

/**
 * Stripe Terminal configuration
 */
export const TERMINAL_CONFIG = {
    // Default location settings for Terminal
    defaultCountry: 'GB',
    defaultCurrency: 'gbp',
    // Supported reader types
    readerTypes: ['bbpos_wisepad3', 'stripe_m2', 'verifone_p400'] as const,
} as const

/**
 * Create a Terminal location for a Connect account
 * Used for registering card readers to a tradesperson's account
 */
export async function createTerminalLocation(params: {
    accountId: string
    displayName: string
    address: {
        line1: string
        city: string
        postalCode: string
        country?: string
    }
}) {
    return await stripe.terminal.locations.create(
        {
            display_name: params.displayName,
            address: {
                line1: params.address.line1,
                city: params.address.city,
                postal_code: params.address.postalCode,
                country: params.address.country || TERMINAL_CONFIG.defaultCountry,
            },
        },
        {
            stripeAccount: params.accountId,
        }
    )
}

/**
 * Register a card reader to a Terminal location
 */
export async function registerTerminalReader(params: {
    accountId: string
    registrationCode: string
    label: string
    locationId: string
}) {
    return await stripe.terminal.readers.create(
        {
            registration_code: params.registrationCode,
            label: params.label,
            location: params.locationId,
        },
        {
            stripeAccount: params.accountId,
        }
    )
}

/**
 * Create a connection token for Terminal reader
 * Used by reader to connect to Stripe's backend
 */
export async function createTerminalConnectionToken(accountId: string) {
    return await stripe.terminal.connectionTokens.create(
        {},
        {
            stripeAccount: accountId,
        }
    )
}

/**
 * Get Terminal reader status
 */
export async function getTerminalReaderStatus(params: {
    accountId: string
    readerId: string
}) {
    return await stripe.terminal.readers.retrieve(
        params.readerId,
        {},
        {
            stripeAccount: params.accountId,
        }
    )
}

/**
 * Create a payment intent for Terminal payment
 * Used for in-person card payments at job completion
 */
export async function createTerminalPaymentIntent(params: {
    accountId: string
    amount: number // Amount in pence
    applicationFeeAmount: number // Platform fee in pence
    transferGroup: string
    metadata: Record<string, string>
}) {
    return await stripe.paymentIntents.create(
        {
            amount: params.amount,
            currency: TERMINAL_CONFIG.defaultCurrency,
            payment_method_types: ['card_present'],
            capture_method: 'automatic',
            application_fee_amount: params.applicationFeeAmount,
            transfer_group: params.transferGroup,
            transfer_data: {
                destination: params.accountId,
            },
            metadata: params.metadata,
        },
        {
            stripeAccount: params.accountId,
        }
    )
}

/**
 * Cancel a Terminal payment intent
 */
export async function cancelTerminalPaymentIntent(params: {
    accountId: string
    paymentIntentId: string
}) {
    return await stripe.paymentIntents.cancel(
        params.paymentIntentId,
        {},
        {
            stripeAccount: params.accountId,
        }
    )
}
