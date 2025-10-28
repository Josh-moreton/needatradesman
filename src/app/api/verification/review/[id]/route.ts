import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { reviewVerificationSchema } from '@/lib/schemas'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user and check if they have admin/ops role
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has ROLE_VERIFIER metadata in Clerk
    const clerkUser = await (await clerkClient()).users.getUser(userId)
    const isVerifier = clerkUser.publicMetadata?.role === 'ROLE_VERIFIER'

    if (!isVerifier) {
      return NextResponse.json(
        { error: 'Only verifiers can review verifications' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = reviewVerificationSchema.parse(body)

    // Get the verification ID from params
    const { id: verificationId } = await params

    // Find the verification
    const verification = await prisma.verification.findUnique({
      where: { id: verificationId },
      include: {
        tradeProfile: {
          include: {
            user: true,
          },
        },
        evidences: true,
      },
    })

    if (!verification) {
      return NextResponse.json({ error: 'Verification not found' }, { status: 404 })
    }

    // Convert string dates to Date objects
    const validFrom = validatedData.validFrom ? new Date(validatedData.validFrom) : verification.validFrom
    const validTo = validatedData.validTo ? new Date(validatedData.validTo) : verification.validTo

    // Update verification status
    const updatedVerification = await prisma.verification.update({
      where: { id: verificationId },
      data: {
        status: validatedData.status,
        publicUrl: validatedData.publicUrl,
        validFrom,
        validTo,
        lastCheckedAt: new Date(),
      },
      include: {
        evidences: true,
      },
    })

    // If approved and badge-worthy, create/update badge
    if (validatedData.status === 'ACTIVE' && verification.schemeName && verification.registrationNo) {
      // Find existing badge for this type
      const existingBadge = await prisma.badge.findFirst({
        where: {
          tradeProfileId: verification.tradeProfileId,
          name: verification.schemeName,
        },
      })

      if (existingBadge) {
        await prisma.badge.update({
          where: { id: existingBadge.id },
          data: {
            value: verification.registrationNo,
            expiresAt: validTo,
          },
        })
      } else {
        await prisma.badge.create({
          data: {
            tradeProfileId: verification.tradeProfileId,
            name: verification.schemeName,
            value: verification.registrationNo,
            expiresAt: validTo,
            isPublic: true,
          },
        })
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        verificationId: updatedVerification.id,
        actorUserId: user.id,
        action: validatedData.status === 'ACTIVE' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_REJECTED',
        details: {
          status: validatedData.status,
          publicUrl: validatedData.publicUrl,
          validFrom,
          validTo,
          notes: validatedData.notes,
        },
      },
    })

    return NextResponse.json(updatedVerification)
  } catch (error) {
    console.error('[Verification Review Error]', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request data', details: error },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to review verification' },
      { status: 500 }
    )
  }
}
