import { Region, TradeCategory, VerificationType } from '@prisma/client'
import { prisma } from './prisma'
import { resolveRequiredVerifications, isEligibleToViewOrQuote } from './verification'

/**
 * Check if a user is eligible to view/quote a specific job
 */
export async function checkJobEligibility(userId: string, jobId: string): Promise<{
  eligible: boolean
  missing: VerificationType[]
  reason?: string
}> {
  // Get user and their trade profile
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tradeProfile: {
        include: {
          verifications: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
      },
    },
  })

  if (!user) {
    return { eligible: false, missing: [], reason: 'User not found' }
  }

  if (user.role !== 'TRADESPERSON') {
    return { eligible: false, missing: [], reason: 'Not a tradesperson' }
  }

  if (!user.tradeProfile) {
    return { eligible: false, missing: [], reason: 'No trade profile' }
  }

  // Get job with trade categories
  const job = await prisma.job.findUnique({
    where: { id: jobId },
  })

  if (!job) {
    return { eligible: false, missing: [], reason: 'Job not found' }
  }

  // If no trade categories specified, only insurance is required
  if (!job.tradeCategories || job.tradeCategories.length === 0) {
    const hasInsurance = user.tradeProfile.verifications.some(
      (v) => v.type === 'INSURANCE_PUBLIC' && v.status === 'ACTIVE'
    )

    if (!hasInsurance) {
      return {
        eligible: false,
        missing: ['INSURANCE_PUBLIC'],
        reason: 'Public liability insurance required',
      }
    }

    return { eligible: true, missing: [] }
  }

  // Resolve required verifications for this job
  const requirements = resolveRequiredVerifications(
    job.tradeCategories as TradeCategory[],
    job.region || Region.ENG_WLS
  )

  // Check eligibility
  const activeVerifications = user.tradeProfile.verifications.map((v) => ({
    type: v.type,
    status: v.status,
    validTo: v.validTo,
  }))

  const eligible = isEligibleToViewOrQuote(activeVerifications, requirements.required)

  if (!eligible) {
    const validTypes = new Set(
      activeVerifications
        .filter((v) => v.status === 'ACTIVE' && (!v.validTo || v.validTo > new Date()))
        .map((v) => v.type)
    )
    const missing = requirements.required.filter((type) => !validTypes.has(type))

    return {
      eligible: false,
      missing,
      reason: `Missing required verifications: ${missing.join(', ')}`,
    }
  }

  return { eligible: true, missing: [] }
}

/**
 * Get all jobs a user is eligible for
 */
export async function getEligibleJobs(userId: string, filters?: {
  status?: string
  category?: string
  limit?: number
  offset?: number
}) {
  // Get user and their verifications
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      tradeProfile: {
        include: {
          verifications: {
            where: {
              status: 'ACTIVE',
            },
          },
        },
      },
    },
  })

  if (!user || user.role !== 'TRADESPERSON' || !user.tradeProfile) {
    return { jobs: [], total: 0 }
  }

  // Get active verification types
  const activeTypes = new Set(
    user.tradeProfile.verifications
      .filter((v) => v.status === 'ACTIVE' && (!v.validTo || v.validTo > new Date()))
      .map((v) => v.type)
  )

  // Get all jobs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: { status?: string; category?: any } = {
    status: filters?.status || 'OPEN',
  }

  if (filters?.category) {
    where.category = filters.category
  }

  const allJobs = await prisma.job.findMany({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    where: where as any,
    take: filters?.limit || 50,
    skip: filters?.offset || 0,
    orderBy: { createdAt: 'desc' },
  })

  // Filter jobs based on eligibility
  const eligibleJobs = allJobs.filter((job) => {
    // If no trade categories, only insurance required
    if (!job.tradeCategories || job.tradeCategories.length === 0) {
      return activeTypes.has('INSURANCE_PUBLIC')
    }

    // Check required verifications
    const requirements = resolveRequiredVerifications(
      job.tradeCategories as TradeCategory[],
      job.region || Region.ENG_WLS
    )

    return requirements.required.every((type) => activeTypes.has(type))
  })

  return {
    jobs: eligibleJobs,
    total: eligibleJobs.length,
  }
}
