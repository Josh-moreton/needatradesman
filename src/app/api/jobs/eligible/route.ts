import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getEligibleJobs } from '@/lib/job-eligibility'

export async function GET(request: NextRequest) {
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
        { error: 'Only tradespeople can access this endpoint' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'OPEN'
    const category = searchParams.get('category') || undefined
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Get eligible jobs
    const result = await getEligibleJobs(user.id, {
      status,
      category,
      limit,
      offset,
    })

    return NextResponse.json({
      jobs: result.jobs,
      total: result.total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('[Eligible Jobs Error]', error)
    return NextResponse.json(
      { error: 'Failed to fetch eligible jobs' },
      { status: 500 }
    )
  }
}
