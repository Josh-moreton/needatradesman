import { auth } from '@clerk/nextjs/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DebugAuthPage() {
    try {
        const { userId, sessionClaims } = await auth();
        const user = await getCurrentUser();

        return (
            <div className="container mx-auto p-8 max-w-4xl">
                <h1 className="text-3xl font-bold mb-6">Auth Debug Info</h1>
                
                <div className="space-y-6">
                    <div className="border rounded-lg p-4">
                        <h2 className="text-xl font-semibold mb-3">Clerk Auth</h2>
                        <dl className="space-y-2">
                            <div>
                                <dt className="font-medium">User ID from Clerk:</dt>
                                <dd className="text-muted-foreground font-mono text-sm">{userId || 'null'}</dd>
                            </div>
                            <div>
                                <dt className="font-medium">Session Claims:</dt>
                                <dd className="text-muted-foreground font-mono text-xs whitespace-pre">
                                    {JSON.stringify(sessionClaims, null, 2)}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="border rounded-lg p-4">
                        <h2 className="text-xl font-semibold mb-3">Database User</h2>
                        <dl className="space-y-2">
                            <div>
                                <dt className="font-medium">User exists in DB:</dt>
                                <dd className="text-muted-foreground">{user ? 'Yes' : 'No'}</dd>
                            </div>
                            {user && (
                                <>
                                    <div>
                                        <dt className="font-medium">Database ID:</dt>
                                        <dd className="text-muted-foreground font-mono text-sm">{user.id}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Email:</dt>
                                        <dd className="text-muted-foreground">{user.email}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Role:</dt>
                                        <dd className="text-muted-foreground font-mono">{user.role || 'null'}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Name:</dt>
                                        <dd className="text-muted-foreground">{user.firstName} {user.lastName}</dd>
                                    </div>
                                    <div>
                                        <dt className="font-medium">Created:</dt>
                                        <dd className="text-muted-foreground">{new Date(user.createdAt).toLocaleString()}</dd>
                                    </div>
                                </>
                            )}
                        </dl>
                    </div>

                    <div className="border rounded-lg p-4 bg-yellow-50 dark:bg-yellow-950/20">
                        <h2 className="text-xl font-semibold mb-3">Environment</h2>
                        <dl className="space-y-2">
                            <div>
                                <dt className="font-medium">NODE_ENV:</dt>
                                <dd className="text-muted-foreground font-mono">{process.env.NODE_ENV}</dd>
                            </div>
                            <div>
                                <dt className="font-medium">Clerk Publishable Key (public):</dt>
                                <dd className="text-muted-foreground font-mono text-xs break-all">
                                    {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20)}...
                                </dd>
                            </div>
                            <div>
                                <dt className="font-medium">Clerk Secret Key exists:</dt>
                                <dd className="text-muted-foreground">{process.env.CLERK_SECRET_KEY ? 'Yes' : 'No'}</dd>
                            </div>
                            <div>
                                <dt className="font-medium">Database URL exists:</dt>
                                <dd className="text-muted-foreground">{process.env.DATABASE_URL ? 'Yes' : 'No'}</dd>
                            </div>
                        </dl>
                    </div>

                    <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                        <h2 className="text-xl font-semibold mb-3">Diagnostics</h2>
                        <ul className="space-y-2 list-disc list-inside">
                            {!userId && (
                                <li className="text-red-600 dark:text-red-400">❌ No Clerk session found - user not authenticated with Clerk</li>
                            )}
                            {userId && !user && (
                                <li className="text-red-600 dark:text-red-400">❌ Clerk user exists but not in database - webhook may not have fired</li>
                            )}
                            {userId && user && !user.role && (
                                <li className="text-red-600 dark:text-red-400">❌ User exists but has no role - onboarding not completed</li>
                            )}
                            {userId && user?.role && (
                                <li className="text-green-600 dark:text-green-400">✅ Everything looks good! User is authenticated and has role: {user.role}</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        );
    } catch (error) {
        return (
            <div className="container mx-auto p-8 max-w-4xl">
                <h1 className="text-3xl font-bold mb-6 text-red-600">Auth Debug Error</h1>
                <div className="border border-red-500 rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                    <pre className="text-sm whitespace-pre-wrap">
                        {error instanceof Error ? error.message : 'Unknown error'}
                    </pre>
                </div>
            </div>
        );
    }
}
