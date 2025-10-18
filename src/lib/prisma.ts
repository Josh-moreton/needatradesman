import { PrismaClient } from '@prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
    const client = new PrismaClient()
    // Only extend with Accelerate if using the accelerate connection URL
    if (process.env.DATABASE_URL?.includes('prisma-data.net')) {
        return client.$extends(withAccelerate()) as unknown as PrismaClient
    }
    return client
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
