import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { submitVerificationSchema } from '@/lib/schemas'
import { VerificationStatus } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { tradeProfile: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only tradespeople can submit verifications
    if (user.role !== 'TRADESPERSON') {
      return NextResponse.json(
        { error: 'Only tradespeople can submit verifications' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = submitVerificationSchema.parse(body)

    // Create trade profile if it doesn't exist
    let tradeProfile = user.tradeProfile
    if (!tradeProfile) {
      tradeProfile = await prisma.tradeProfile.create({
        data: {
          userId: user.id,
          legalEntityType: 'SOLE_TRADER',
        },
      })
    }

    // Convert string dates to Date objects
    const validFrom = validatedData.validFrom ? new Date(validatedData.validFrom) : null
    const validTo = validatedData.validTo ? new Date(validatedData.validTo) : null

    // Create verification record
    const verification = await prisma.verification.create({
      data: {
        tradeProfileId: tradeProfile.id,
        type: validatedData.type,
        schemeName: validatedData.schemeName,
        registrationNo: validatedData.registrationNo,
        level: validatedData.level,
        status: VerificationStatus.PENDING,
        validFrom,
        validTo,
        fields: validatedData.fields || {},
        evidences: {
          create: validatedData.evidences?.map((evidence) => ({
            kind: evidence.kind,
            url: evidence.url,
            meta: evidence.meta || {},
          })) || [],
        },
      },
      include: {
        evidences: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        verificationId: verification.id,
        actorUserId: user.id,
        action: 'VERIFICATION_SUBMITTED',
        details: {
          type: validatedData.type,
          schemeName: validatedData.schemeName,
          registrationNo: validatedData.registrationNo,
        },
      },
    })

    return NextResponse.json(verification, { status: 201 })
  } catch (error) {
    console.error('[Verification Submit Error]', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to submit verification' },
      { status: 500 }
    )
  }
}
