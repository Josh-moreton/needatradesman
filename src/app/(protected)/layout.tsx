/**
 * Protected Layout - Authorization Gate
 * 
 * This layout wraps all protected routes and ensures:
 * 1. User is authenticated (handled by middleware)
 * 2. Onboarding state is handled by child layouts (e.g., dashboard layout)
 * 
 * Note: Individual route layouts (like dashboard) handle role checks and onboarding.
 * This parent layout just ensures authentication via middleware.
 */

export default async function ProtectedLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Middleware ensures user is authenticated
    // Child layouts (like dashboard) handle role checks and onboarding
    return <>{children}</>
}
