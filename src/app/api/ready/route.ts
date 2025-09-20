import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface ReadinessCheckResult {
  status: 'ready' | 'not_ready'
  timestamp: string
  checks: {
    database: 'pass' | 'fail'
    environment: 'pass' | 'fail'
  }
  errors?: string[]
}

export async function GET() {
  const startTime = Date.now()
  const errors: string[] = []
  
  const result: ReadinessCheckResult = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'fail',
      environment: 'fail'
    }
  }

  // Check database readiness (can we make queries?)
  try {
    await prisma.user.findFirst({
      take: 1
    })
    result.checks.database = 'pass'
  } catch (error) {
    result.checks.database = 'fail'
    errors.push(`Database not ready: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Check critical environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'CLERK_SECRET_KEY',
    'CLERK_PUBLISHABLE_KEY',
    'NEXTAUTH_SECRET'
  ]

  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar])
  
  if (missingEnvVars.length === 0) {
    result.checks.environment = 'pass'
  } else {
    result.checks.environment = 'fail'
    errors.push(`Missing required environment variables: ${missingEnvVars.join(', ')}`)
  }

  // Determine overall readiness status
  const failedChecks = Object.values(result.checks).filter(status => status === 'fail')
  if (failedChecks.length > 0) {
    result.status = 'not_ready'
  }

  if (errors.length > 0) {
    result.errors = errors
  }

  const responseTime = Date.now() - startTime
  
  // Return appropriate HTTP status code
  const statusCode = result.status === 'ready' ? 200 : 503

  return NextResponse.json({
    ...result,
    responseTimeMs: responseTime
  }, { status: statusCode })
}