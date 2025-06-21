import { auth } from '@clerk/nextjs/server'
import { prisma } from './prisma'
import { UserRole } from '@prisma/client'

export async function getCurrentUser() {
  const { userId } = await auth()
  
  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('User not authenticated')
  }

  return user
}

export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth()
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Access denied. Required roles: ${allowedRoles.join(', ')}`)
  }

  return user
}

export async function needsOnboarding() {
  const { userId } = await auth()
  
  if (!userId) {
    return false
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId }
  })

  // User needs onboarding if they don't exist in our DB or don't have a role
  return !user || !user.role
}
