import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth-gate'
import { UserRole } from '@prisma/client'

export async function GET() {
    try {
        // Require admin role
        await requireRole(UserRole.ADMIN)

        // Fetch all jobs with customer and messages info
        const jobs = await prisma.job.findMany({
            include: {
                customer: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        clerkId: true,
                    }
                },
                applications: {
                    include: {
                        tradesperson: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                                clerkId: true,
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        messages: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        return NextResponse.json({ jobs })
    } catch (error) {
        console.error('Error fetching jobs for admin:', error)
        
        if (error instanceof Error && error.message.includes('Forbidden')) {
            return NextResponse.json(
                { error: 'Unauthorized: Admin access required' },
                { status: 403 }
            )
        }

        return NextResponse.json(
            { error: 'Failed to fetch jobs' },
            { status: 500 }
        )
    }
}
