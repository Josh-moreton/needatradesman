'use client'

import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Shield } from 'lucide-react'

interface BadgeData {
  id: string
  name: string
  value: string
  expiresAt?: string | null
  isPublic: boolean
}

interface VerificationBadgesProps {
  badges: BadgeData[]
  showExpiry?: boolean
}

export function VerificationBadges({ badges, showExpiry = true }: VerificationBadgesProps) {
  if (!badges || badges.length === 0) {
    return null
  }

  const formatExpiryDate = (date: string | null | undefined) => {
    if (!date) return null
    try {
      return new Date(date).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
      })
    } catch {
      return null
    }
  }

  const isExpiringSoon = (date: string | null | undefined) => {
    if (!date) return false
    const expiry = new Date(date)
    const now = new Date()
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    return expiry <= thirtyDaysFromNow && expiry > now
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span>Verified Qualifications</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => {
          const expiry = formatExpiryDate(badge.expiresAt)
          const expiring = isExpiringSoon(badge.expiresAt)

          return (
            <Badge
              key={badge.id}
              variant="outline"
              className={`flex items-center gap-1.5 py-1.5 px-3 ${
                expiring ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-green-300 bg-green-50 text-green-700'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <div className="flex flex-col items-start">
                <span className="font-medium">{badge.name}</span>
                {badge.value && (
                  <span className="text-xs opacity-80">
                    {badge.value}
                  </span>
                )}
                {showExpiry && expiry && (
                  <span className="text-xs opacity-80">
                    {expiring ? 'Expires' : 'Valid until'} {expiry}
                  </span>
                )}
              </div>
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
