#!/usr/bin/env tsx
/**
 * Clerk to Prisma Sync Verification Script
 * 
 * This script checks for drift between Clerk and Prisma database by:
 * 1. Fetching all users from Clerk
 * 2. Comparing with users in Prisma DB
 * 3. Reporting any missing or mismatched users
 * 
 * Usage:
 *   pnpm tsx scripts/verify-clerk-sync.ts [--fix]
 * 
 * Options:
 *   --fix    Automatically sync missing users to the database
 */

import { clerkClient } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface SyncReport {
    totalClerkUsers: number
    totalPrismaUsers: number
    missingInPrisma: string[]
    missingInClerk: string[]
    emailMismatches: Array<{ clerkId: string; clerkEmail: string; prismaEmail: string }>
}

async function verifySync(fix: boolean = false): Promise<SyncReport> {
    console.log('🔍 Starting Clerk to Prisma sync verification...\n')

    const report: SyncReport = {
        totalClerkUsers: 0,
        totalPrismaUsers: 0,
        missingInPrisma: [],
        missingInClerk: [],
        emailMismatches: [],
    }

    try {
        // Fetch all users from Clerk
        console.log('📥 Fetching users from Clerk...')
        const client = await clerkClient()
        
        // Fetch all users with pagination
        const allClerkUsers = []
        let offset = 0
        const limit = 500
        let hasMore = true
        
        while (hasMore) {
            const response = await client.users.getUserList({ 
                limit,
                offset 
            })
            allClerkUsers.push(...response.data)
            offset += limit
            hasMore = response.data.length === limit
            
            if (hasMore) {
                console.log(`   Fetched ${allClerkUsers.length} users so far...`)
            }
        }
        
        const clerkUsers = allClerkUsers
        report.totalClerkUsers = clerkUsers.length
        console.log(`   Found ${report.totalClerkUsers} users in Clerk\n`)

        // Fetch all users from Prisma
        console.log('📥 Fetching users from Prisma...')
        const prismaUsers = await prisma.user.findMany({
            select: {
                clerkId: true,
                email: true,
                firstName: true,
                lastName: true,
            }
        })
        report.totalPrismaUsers = prismaUsers.length
        console.log(`   Found ${report.totalPrismaUsers} users in Prisma\n`)

        // Create lookup maps
        const prismaUserMap = new Map(prismaUsers.map(u => [u.clerkId, u]))
        const clerkUserMap = new Map(clerkUsers.map(u => [u.id, u]))

        // Check for users in Clerk but not in Prisma
        console.log('🔎 Checking for users in Clerk missing from Prisma...')
        for (const clerkUser of clerkUsers) {
            if (!prismaUserMap.has(clerkUser.id)) {
                const primaryEmail = clerkUser.emailAddresses.find(
                    e => e.id === clerkUser.primaryEmailAddressId
                )
                
                report.missingInPrisma.push(clerkUser.id)
                console.log(`   ❌ Missing: ${clerkUser.id} (${primaryEmail?.emailAddress || 'no email'})`)
                
                if (fix) {
                    // Sync the missing user
                    if (primaryEmail) {
                        try {
                            await prisma.user.create({
                                data: {
                                    clerkId: clerkUser.id,
                                    email: primaryEmail.emailAddress,
                                    firstName: clerkUser.firstName || null,
                                    lastName: clerkUser.lastName || null,
                                    role: 'CUSTOMER', // Default role
                                }
                            })
                            console.log(`   ✅ Fixed: Synced user ${clerkUser.id} to database`)
                        } catch (error) {
                            console.log(`   ⚠️  Error syncing user ${clerkUser.id}:`, error)
                        }
                    }
                }
            }
        }

        if (report.missingInPrisma.length === 0) {
            console.log('   ✅ All Clerk users exist in Prisma\n')
        } else {
            console.log(`   Found ${report.missingInPrisma.length} users missing in Prisma\n`)
        }

        // Check for users in Prisma but not in Clerk (orphaned users)
        console.log('🔎 Checking for orphaned users in Prisma...')
        for (const prismaUser of prismaUsers) {
            if (!clerkUserMap.has(prismaUser.clerkId)) {
                report.missingInClerk.push(prismaUser.clerkId)
                console.log(`   ⚠️  Orphaned: ${prismaUser.clerkId} (${prismaUser.email})`)
            }
        }

        if (report.missingInClerk.length === 0) {
            console.log('   ✅ No orphaned users in Prisma\n')
        } else {
            console.log(`   Found ${report.missingInClerk.length} orphaned users in Prisma\n`)
        }

        // Check for email mismatches
        console.log('🔎 Checking for email mismatches...')
        for (const clerkUser of clerkUsers) {
            const prismaUser = prismaUserMap.get(clerkUser.id)
            if (prismaUser) {
                const clerkEmail = clerkUser.emailAddresses.find(
                    e => e.id === clerkUser.primaryEmailAddressId
                )?.emailAddress
                
                if (clerkEmail && clerkEmail !== prismaUser.email) {
                    report.emailMismatches.push({
                        clerkId: clerkUser.id,
                        clerkEmail,
                        prismaEmail: prismaUser.email,
                    })
                    console.log(`   ⚠️  Mismatch: ${clerkUser.id}`)
                    console.log(`      Clerk: ${clerkEmail}`)
                    console.log(`      Prisma: ${prismaUser.email}`)
                    
                    if (fix) {
                        try {
                            await prisma.user.update({
                                where: { clerkId: clerkUser.id },
                                data: { email: clerkEmail }
                            })
                            console.log(`   ✅ Fixed: Updated email for ${clerkUser.id}`)
                        } catch (error) {
                            console.log(`   ⚠️  Error updating email for ${clerkUser.id}:`, error)
                        }
                    }
                }
            }
        }

        if (report.emailMismatches.length === 0) {
            console.log('   ✅ All emails match\n')
        } else {
            console.log(`   Found ${report.emailMismatches.length} email mismatches\n`)
        }

        // Print summary
        console.log('📊 Summary Report:')
        console.log('═══════════════════════════════════════')
        console.log(`Total users in Clerk:     ${report.totalClerkUsers}`)
        console.log(`Total users in Prisma:    ${report.totalPrismaUsers}`)
        console.log(`Missing in Prisma:        ${report.missingInPrisma.length}`)
        console.log(`Orphaned in Prisma:       ${report.missingInClerk.length}`)
        console.log(`Email mismatches:         ${report.emailMismatches.length}`)
        console.log('═══════════════════════════════════════\n')

        const hasIssues = report.missingInPrisma.length > 0 || 
                         report.missingInClerk.length > 0 || 
                         report.emailMismatches.length > 0

        if (hasIssues) {
            if (fix) {
                console.log('✅ Sync issues have been automatically fixed')
            } else {
                console.log('⚠️  Sync issues detected. Run with --fix to automatically resolve them')
            }
        } else {
            console.log('✅ Clerk and Prisma are perfectly in sync!')
        }

        return report

    } catch (error) {
        console.error('❌ Error during sync verification:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }
}

// Run the script
const args = process.argv.slice(2)
const fix = args.includes('--fix')

if (fix) {
    console.log('🔧 Fix mode enabled - will automatically sync missing users\n')
}

verifySync(fix)
    .then(() => {
        process.exit(0)
    })
    .catch((error) => {
        console.error('Fatal error:', error)
        process.exit(1)
    })
