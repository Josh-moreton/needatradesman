import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { VerificationStatus } from '@prisma/client'
import { isExpired, isExpiringSoon } from '@/lib/verification'

/**
 * Cron job to sweep expired verifications and send notifications
 * Should be run nightly via Vercel Cron or similar
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = {
      expired: 0,
      expiring30Days: 0,
      expiring14Days: 0,
      expiring7Days: 0,
      badgesRemoved: 0,
    }

    // Find all ACTIVE verifications with expiry dates
    const activeVerifications = await prisma.verification.findMany({
      where: {
        status: VerificationStatus.ACTIVE,
        validTo: {
          not: null,
        },
      },
      include: {
        tradeProfile: {
          include: {
            user: true,
          },
        },
      },
    })

    // Process each verification
    for (const verification of activeVerifications) {
      if (!verification.validTo) continue

      // Check if expired
      if (isExpired(verification.validTo)) {
        // Mark as expired
        await prisma.verification.update({
          where: { id: verification.id },
          data: { status: VerificationStatus.EXPIRED },
        })

        // Remove related badges
        const badgesDeleted = await prisma.badge.deleteMany({
          where: {
            tradeProfileId: verification.tradeProfileId,
            name: verification.schemeName || undefined,
          },
        })

        results.badgesRemoved += badgesDeleted.count

        // Create audit log
        await prisma.auditLog.create({
          data: {
            verificationId: verification.id,
            action: 'VERIFICATION_EXPIRED',
            details: {
              type: verification.type,
              expiredAt: now,
            },
          },
        })

        results.expired++

        // TODO: Send notification to tradesperson
        console.log(`Verification expired for user ${verification.tradeProfile.user.email}`)
      }
      // Check if expiring soon
      else if (isExpiringSoon(verification.validTo, 30)) {
        const daysUntilExpiry = Math.ceil((verification.validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntilExpiry <= 7) {
          results.expiring7Days++
          // TODO: Send urgent notification
          console.log(`Verification expiring in ${daysUntilExpiry} days for user ${verification.tradeProfile.user.email}`)
        } else if (daysUntilExpiry <= 14) {
          results.expiring14Days++
          // TODO: Send warning notification
          console.log(`Verification expiring in ${daysUntilExpiry} days for user ${verification.tradeProfile.user.email}`)
        } else if (daysUntilExpiry <= 30) {
          results.expiring30Days++
          // TODO: Send reminder notification
          console.log(`Verification expiring in ${daysUntilExpiry} days for user ${verification.tradeProfile.user.email}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    })
  } catch (error) {
    console.error('[Verification Expiry Sweep Error]', error)
    return NextResponse.json(
      { error: 'Failed to sweep expired verifications' },
      { status: 500 }
    )
  }
}
