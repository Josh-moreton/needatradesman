import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing Stripe secret key')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
    typescript: true,
})

export const STRIPE_CONFIG = {
    currency: 'gbp',
    paymentMethods: ['card'],
    mode: 'payment',
} as const
