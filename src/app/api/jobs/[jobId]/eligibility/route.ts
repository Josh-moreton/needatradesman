import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { checkJobEligibility } from '@/lib/job-eligibility'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'TRADESPERSON') {
      return NextResponse.json(
        { error: 'Only tradespeople can check job eligibility' },
        { status: 403 }
      )
    }

    // Get job ID from params
    const { jobId } = await params

    // Check eligibility
    const result = await checkJobEligibility(user.id, jobId)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Job Eligibility Check Error]', error)
    return NextResponse.json(
      { error: 'Failed to check job eligibility' },
      { status: 500 }
    )
  }
}
