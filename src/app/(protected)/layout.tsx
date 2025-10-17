/**
 * Protected Layout - Authorization Gate
 * 
 * This layout wraps all protected routes and ensures:
 * 1. User is authenticated (handled by middleware)
 * 2. User has completed onboarding (checked here via DB)
 * 
 * This is the RIGHT place to check onboarding state - in a Server Component,
 * not in Middleware. We query the database (cached) to get the user's role.
 */

import { redirect } from 'next/navigation'
import { getAuthGate } from '@/lib/auth-gate'

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Get user gate data from DB (cached for 60s)
    const gate = await getAuthGate()

    // If no user found in DB, they need to complete onboarding
    // (They're authenticated because middleware checked that, but not in our DB yet)
    if (!gate) {
        redirect('/onboarding')
    }

    // User is authenticated AND onboarded (has a role in DB)
    return <>{children}</>
}
