import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-gate'
import { UserRole } from '@prisma/client'
import { clerkClient } from '@clerk/nextjs/server'

export async function GET() {
    try {
        // Require admin role
        await requireRole(UserRole.ADMIN)

        // Fetch all users from our database
        const dbUsers = await prisma.user.findMany({
            select: {
                id: true,
                clerkId: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                trades: true,
                stripeAccountId: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Fetch all users from Clerk
        const client = await clerkClient()
        const clerkUsers = await client.users.getUserList({
            limit: 500, // Adjust as needed
        })

        // Create a map of Clerk users by ID for easy lookup
        const clerkUsersMap = new Map(
            clerkUsers.data.map(user => [
                user.id,
                {
                    id: user.id,
                    email: user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    createdAt: user.createdAt,
                    lastSignInAt: user.lastSignInAt,
                }
            ])
        )

        // Create a map of DB users by clerkId for easy lookup
        const dbUsersMap = new Map(
            dbUsers.map(user => [user.clerkId, user])
        )

        // Combine data and check sync status
        const usersWithSyncStatus = []

        // Add all users from Clerk with their sync status
        for (const [clerkId, clerkUser] of clerkUsersMap) {
            const dbUser = dbUsersMap.get(clerkId)
            usersWithSyncStatus.push({
                clerkId,
                clerkData: clerkUser,
                dbData: dbUser || null,
                synced: !!dbUser,
                syncIssues: checkSyncIssues(clerkUser, dbUser || null),
            })
        }

        // Add any DB users not found in Clerk (orphaned)
        for (const dbUser of dbUsers) {
            if (!clerkUsersMap.has(dbUser.clerkId)) {
                usersWithSyncStatus.push({
                    clerkId: dbUser.clerkId,
                    clerkData: null,
                    dbData: dbUser,
                    synced: false,
                    syncIssues: ['User exists in DB but not in Clerk (orphaned)'],
                })
            }
        }

        return NextResponse.json({
            users: usersWithSyncStatus,
            total: usersWithSyncStatus.length,
            synced: usersWithSyncStatus.filter(u => u.synced).length,
            unsynced: usersWithSyncStatus.filter(u => !u.synced).length,
        })
    } catch (error) {
        console.error('Error fetching users for admin:', error)
        
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to fetch users' },
            { status: 500 }
        )
    }
}

function checkSyncIssues(
    clerkUser: { email?: string; firstName: string | null; lastName: string | null },
    dbUser: { email: string; firstName: string | null; lastName: string | null; role: UserRole } | null
): string[] {
    if (!dbUser) {
        return ['User not synced to database']
    }

    const issues = []

    if (clerkUser.email && clerkUser.email !== dbUser.email) {
        issues.push(`Email mismatch: Clerk="${clerkUser.email}" DB="${dbUser.email}"`)
    }

    if (clerkUser.firstName !== dbUser.firstName) {
        issues.push(`First name mismatch: Clerk="${clerkUser.firstName}" DB="${dbUser.firstName}"`)
    }

    if (clerkUser.lastName !== dbUser.lastName) {
        issues.push(`Last name mismatch: Clerk="${clerkUser.lastName}" DB="${dbUser.lastName}"`)
    }

    if (dbUser.role === UserRole.PENDING) {
        issues.push('User has not completed onboarding')
    }

    return issues
}
