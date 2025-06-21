import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { UserRole } from '@prisma/client'
import { z } from 'zod'

const setRoleSchema = z.object({
  role: z.nativeEnum(UserRole)
})

export async function POST(request: NextRequest) {
  try {
    // Get the authenticated user
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate the request body
    const body = await request.json()
    const { role } = setRoleSchema.parse(body)

    // Check if user already exists in our database
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (existingUser) {
      // Update existing user's role
      const updatedUser = await prisma.user.update({
        where: { clerkId: userId },
        data: { role }
      })
      
      return NextResponse.json({ 
        success: true, 
        user: updatedUser 
      })
    } else {
      // Create new user record
      const newUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: '', // We'll get this from Clerk webhook later
          role
        }
      })

      return NextResponse.json({ 
        success: true, 
        user: newUser 
      })
    }
  } catch (error) {
    console.error('Error setting user role:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid role provided' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
