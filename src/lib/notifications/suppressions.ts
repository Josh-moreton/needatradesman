/**
 * Email suppression service
 * Manages email suppressions for bounces, complaints, and unsubscribes
 */

import { prisma } from '@/lib/prisma';
import { SuppressionReason } from '@prisma/client';

/**
 * Check if an email is suppressed
 */
export async function isEmailSuppressed(email: string): Promise<boolean> {
  const suppression = await prisma.emailSuppression.findFirst({
    where: { email },
  });
  return !!suppression;
}

/**
 * Add email to suppression list
 */
export async function suppressEmail(params: {
  email: string;
  userId?: string;
  reason: SuppressionReason;
  source?: string;
}) {
  return prisma.emailSuppression.upsert({
    where: {
      email_reason: {
        email: params.email,
        reason: params.reason,
      },
    },
    create: {
      email: params.email,
      userId: params.userId,
      reason: params.reason,
      source: params.source,
    },
    update: {
      source: params.source,
    },
  });
}

/**
 * Remove email from suppression list (for manual re-enable)
 */
export async function unsuppressEmail(email: string, reason: SuppressionReason) {
  return prisma.emailSuppression.deleteMany({
    where: {
      email,
      reason,
    },
  });
}

/**
 * Get all suppressions for an email
 */
export async function getEmailSuppressions(email: string) {
  return prisma.emailSuppression.findMany({
    where: { email },
  });
}

/**
 * Get all suppressions for a user
 */
export async function getUserSuppressions(userId: string) {
  return prisma.emailSuppression.findMany({
    where: { userId },
  });
}
