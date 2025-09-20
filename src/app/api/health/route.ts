import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: {
    database: 'healthy' | 'unhealthy' | 'unavailable'
    redis: 'healthy' | 'unhealthy' | 'unavailable'
    pusher: 'healthy' | 'unhealthy' | 'unavailable'
    stripe: 'healthy' | 'unhealthy' | 'unavailable'
  }
  errors?: string[]
}

export async function GET() {
  const startTime = Date.now()
  const errors: string[] = []
  
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unavailable',
      redis: 'unavailable', 
      pusher: 'unavailable',
      stripe: 'unavailable'
    }
  }

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`
    result.services.database = 'healthy'
  } catch (error) {
    result.services.database = 'unhealthy'
    errors.push(`Database: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Check Redis connectivity
  try {
    if (redis) {
      await redis.ping()
      result.services.redis = 'healthy'
    } else {
      result.services.redis = 'unavailable'
      errors.push('Redis: Not configured')
    }
  } catch (error) {
    result.services.redis = 'unhealthy'
    errors.push(`Redis: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Check Pusher connectivity
  try {
    if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET) {
      // Simple check - if environment variables are present, assume healthy
      // In a real implementation, you might want to make a test API call
      result.services.pusher = 'healthy'
    } else {
      result.services.pusher = 'unavailable'
      errors.push('Pusher: Environment variables not configured')
    }
  } catch (error) {
    result.services.pusher = 'unhealthy'
    errors.push(`Pusher: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Check Stripe connectivity
  try {
    if (process.env.STRIPE_SECRET_KEY) {
      // Simple check - if API key is present, assume healthy
      // In a real implementation, you might want to make a test API call
      result.services.stripe = 'healthy'
    } else {
      result.services.stripe = 'unavailable'
      errors.push('Stripe: API key not configured')
    }
  } catch (error) {
    result.services.stripe = 'unhealthy'
    errors.push(`Stripe: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Determine overall health status
  const unhealthyServices = Object.values(result.services).filter(status => status === 'unhealthy')
  if (unhealthyServices.length > 0) {
    result.status = 'unhealthy'
  }

  if (errors.length > 0) {
    result.errors = errors
  }

  const responseTime = Date.now() - startTime
  
  // Return appropriate HTTP status code
  const statusCode = result.status === 'healthy' ? 200 : 503

  return NextResponse.json({
    ...result,
    responseTimeMs: responseTime
  }, { status: statusCode })
}