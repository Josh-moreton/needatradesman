import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Fallback for development
let prismaClient;
try {
  prismaClient = new PrismaClient();
} catch (error) {
  console.warn('Prisma client initialization failed, using mock:', error.message);
  // Mock client for development when Prisma isn't fully set up
  prismaClient = {
    user: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null) },
    job: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null) },
    application: { findMany: () => Promise.resolve([]), findUnique: () => Promise.resolve(null) },
    // Add other models as needed
  };
}

export const prisma = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
