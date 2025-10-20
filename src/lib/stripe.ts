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
