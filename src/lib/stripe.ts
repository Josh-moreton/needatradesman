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
    paymentMethods: ['card'],
    mode: 'payment',
} as const
