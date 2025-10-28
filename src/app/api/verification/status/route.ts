import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { isExpired, isExpiringSoon } from '@/lib/verification'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        tradeProfile: {
          include: {
            verifications: {
              include: {
                evidences: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
            badges: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.tradeProfile) {
      return NextResponse.json({
        hasProfile: false,
        verifications: [],
        badges: [],
        summary: {
          total: 0,
          pending: 0,
          active: 0,
          expired: 0,
          rejected: 0,
          expiringSoon: 0,
        },
      })
    }

    const verifications = user.tradeProfile.verifications
    const badges = user.tradeProfile.badges

    // Calculate summary statistics
    const summary = {
      total: verifications.length,
      pending: verifications.filter((v: { status: string }) => v.status === 'PENDING').length,
      active: verifications.filter((v: { status: string }) => v.status === 'ACTIVE').length,
      expired: verifications.filter((v: { status: string }) => v.status === 'EXPIRED').length,
      rejected: verifications.filter((v: { status: string }) => v.status === 'REJECTED').length,
      expiringSoon: verifications.filter(
        (v: { status: string; validTo: Date | null }) => v.status === 'ACTIVE' && v.validTo && isExpiringSoon(v.validTo, 30)
      ).length,
    }

    // Add expiry status to verifications
    const verificationsWithStatus = verifications.map((v: { validTo: Date | null }) => ({
      ...v,
      isExpired: v.validTo ? isExpired(v.validTo) : false,
      isExpiringSoon: v.validTo ? isExpiringSoon(v.validTo, 30) : false,
      daysUntilExpiry: v.validTo
        ? Math.ceil((v.validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null,
    }))

    return NextResponse.json({
      hasProfile: true,
      tradeProfile: {
        id: user.tradeProfile.id,
        legalEntityType: user.tradeProfile.legalEntityType,
        companyNumber: user.tradeProfile.companyNumber,
        vatNumber: user.tradeProfile.vatNumber,
        hasEmployees: user.tradeProfile.hasEmployees,
      },
      verifications: verificationsWithStatus,
      badges,
      summary,
    })
  } catch (error) {
    console.error('[Verification Status Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch verification status' },
      { status: 500 }
    )
  }
}
