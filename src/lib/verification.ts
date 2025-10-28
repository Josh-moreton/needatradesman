import { Region, TradeCategory, VerificationType, VerificationStatus } from '@prisma/client'
import verificationMatrix from './verification-matrix.json'

export interface VerificationRequirements {
  required: VerificationType[]
  optional: VerificationType[]
}

export interface ActiveVerification {
  type: VerificationType
  status: VerificationStatus
  validTo: Date | null
}

interface MatrixRegionRules {
  required: string[]
  optional: string[]
}

interface MatrixCategoryRules {
  [region: string]: MatrixRegionRules | undefined
}

interface MatrixData {
  version: string
  matrix: {
    [category: string]: MatrixCategoryRules
  }
}

/**
 * Resolve required and optional verification types for given trade categories and region
 */
export function resolveRequiredVerifications(
  categories: TradeCategory[],
  region: Region
): VerificationRequirements {
  const allRequired = new Set<VerificationType>()
  const allOptional = new Set<VerificationType>()
  const matrix = verificationMatrix as MatrixData

  for (const category of categories) {
    const categoryRules = matrix.matrix[category]
    if (!categoryRules) continue

    // Check for region-specific rules first, then fall back to ALL
    const regionRules = (categoryRules[region as string] || categoryRules.ALL) as MatrixRegionRules | undefined
    if (!regionRules) continue

    regionRules.required.forEach((type: string) => allRequired.add(type as VerificationType))
    regionRules.optional.forEach((type: string) => allOptional.add(type as VerificationType))
  }

  return {
    required: Array.from(allRequired),
    optional: Array.from(allOptional),
  }
}

/**
 * Check if a user is eligible to view or quote a job based on their active verifications
 */
export function isEligibleToViewOrQuote(
  activeVerifications: ActiveVerification[],
  requiredTypes: VerificationType[]
): boolean {
  // Filter to only ACTIVE verifications that haven't expired
  const now = new Date()
  const validVerifications = activeVerifications.filter((v) => {
    if (v.status !== VerificationStatus.ACTIVE) return false
    if (v.validTo && v.validTo < now) return false
    return true
  })

  const validTypes = new Set(validVerifications.map((v) => v.type))

  // Check that all required types are present
  for (const requiredType of requiredTypes) {
    if (!validTypes.has(requiredType)) {
      return false
    }
  }

  return true
}

/**
 * Get verification types that are missing for eligibility
 */
export function getMissingVerifications(
  activeVerifications: ActiveVerification[],
  requiredTypes: VerificationType[]
): VerificationType[] {
  const now = new Date()
  const validTypes = new Set(
    activeVerifications
      .filter((v) => {
        if (v.status !== VerificationStatus.ACTIVE) return false
        if (v.validTo && v.validTo < now) return false
        return true
      })
      .map((v) => v.type)
  )

  return requiredTypes.filter((type) => !validTypes.has(type))
}

/**
 * Check if a verification is expired or expiring soon
 */
export function isExpiringSoon(validTo: Date | null, days: number = 30): boolean {
  if (!validTo) return false
  const now = new Date()
  const threshold = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return validTo <= threshold && validTo > now
}

/**
 * Check if a verification is expired
 */
export function isExpired(validTo: Date | null): boolean {
  if (!validTo) return false
  return validTo < new Date()
}
