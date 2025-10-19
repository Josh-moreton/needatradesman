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
    // Platform commission - the percentage fee you charge on each transaction
    // Note: Set low (1%) initially to gain market traction
    // Industry standard: 5-20% (Airbnb ~15%, Uber ~25%, Upwork ~20%)
    platformFeePercentage: 10,
} as const

/**
 * Calculate platform fee for a given amount
 * @param amount Amount in GBP (pounds)
 * @returns Platform fee in pence (smallest currency unit)
 */
export function calculatePlatformFee(amount: number): number {
    const amountInPence = Math.round(amount * 100)
    const platformFee = Math.round(amountInPence * (STRIPE_CONFIG.platformFeePercentage / 100))
    return platformFee
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
