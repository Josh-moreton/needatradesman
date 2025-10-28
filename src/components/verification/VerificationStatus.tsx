'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface VerificationSummary {
  total: number
  pending: number
  active: number
  expired: number
  rejected: number
  expiringSoon: number
}

interface Verification {
  id: string
  type: string
  schemeName?: string
  registrationNo?: string
  status: string
  validTo?: string
  isExpired: boolean
  isExpiringSoon: boolean
  daysUntilExpiry?: number
}

interface VerificationStatusData {
  hasProfile: boolean
  verifications: Verification[]
  summary: VerificationSummary
}

export function VerificationStatus() {
  const [data, setData] = useState<VerificationStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/verification/status')
      if (!response.ok) {
        throw new Error('Failed to fetch verification status')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading verification status...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!data?.hasProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Status</CardTitle>
          <CardDescription>
            Complete your trade profile to start verifying your qualifications
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'EXPIRED':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'EXPIRED':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const formatVerificationType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verification Status</CardTitle>
        <CardDescription>
          Your qualifications and compliance status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-2xl font-bold text-green-700">{data.summary.active}</div>
            <div className="text-xs text-green-600">Active</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <div className="text-2xl font-bold text-yellow-700">{data.summary.pending}</div>
            <div className="text-xs text-yellow-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-2xl font-bold text-orange-700">{data.summary.expired}</div>
            <div className="text-xs text-orange-600">Expired</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-2xl font-bold text-red-700">{data.summary.rejected}</div>
            <div className="text-xs text-red-600">Rejected</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-700">{data.summary.expiringSoon}</div>
            <div className="text-xs text-blue-600">Expiring Soon</div>
          </div>
        </div>

        {/* Expiring Soon Alert */}
        {data.summary.expiringSoon > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {data.summary.expiringSoon} verification(s) expiring within 30 days.
              Please renew them to continue quoting on regulated jobs.
            </AlertDescription>
          </Alert>
        )}

        {/* Expired Alert */}
        {data.summary.expired > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You have {data.summary.expired} expired verification(s).
              Your ability to quote on certain jobs may be paused until you renew them.
            </AlertDescription>
          </Alert>
        )}

        {/* Verifications List */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Your Verifications</h3>
          {data.verifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No verifications submitted yet. Add your qualifications to unlock more jobs.
            </p>
          ) : (
            data.verifications.map((verification) => (
              <div
                key={verification.id}
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(verification.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">
                        {verification.schemeName || formatVerificationType(verification.type)}
                      </p>
                      <Badge className={getStatusColor(verification.status)}>
                        {verification.status}
                      </Badge>
                      {verification.isExpiringSoon && (
                        <Badge variant="outline" className="border-orange-300 text-orange-700">
                          Expiring Soon
                        </Badge>
                      )}
                    </div>
                    {verification.registrationNo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Reg No: {verification.registrationNo}
                      </p>
                    )}
                    {verification.validTo && (
                      <p className="text-xs text-muted-foreground">
                        {verification.isExpired ? 'Expired' : 'Expires'}: {new Date(verification.validTo).toLocaleDateString()}
                        {verification.daysUntilExpiry !== undefined && verification.daysUntilExpiry > 0 && (
                          <span className="ml-1">
                            ({verification.daysUntilExpiry} days)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
