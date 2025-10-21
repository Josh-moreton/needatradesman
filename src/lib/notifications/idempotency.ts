/**
 * Idempotency service for email sending
 * Uses SHA-256 hash to prevent duplicate email sends
 */

import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { EmailEvent } from './events';

/**
 * Generate idempotency key from event type and payload
 */
export function generateIdempotencyKey(event: EmailEvent): string {
  const hash = createHash('sha256');
  hash.update(event.type);
  hash.update(JSON.stringify(event));
  return hash.digest('hex');
}

/**
 * Generate payload hash for verification
 */
export function generatePayloadHash(payload: unknown): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(payload));
  return hash.digest('hex');
}

/**
 * Check if event has already been processed
 */
export async function isEventProcessed(idempotencyKey: string): Promise<boolean> {
  const existingEvent = await prisma.emailEvent.findUnique({
    where: { idempotencyKey },
  });

  if (!existingEvent) return false;

  // Consider SENT and PENDING as processed. For FAILED events, avoid indefinite retries by
  // treating an old failure as processed (no immediate retry). We allow retries within 24h.
  if (existingEvent.status === 'SENT' || existingEvent.status === 'PENDING') {
    return true;
  }

  if (existingEvent.status === 'FAILED') {
    const createdAt = new Date(existingEvent.createdAt).getTime();
    const ageMs = Date.now() - createdAt;
    const retryWindowMs = 24 * 60 * 60 * 1000; // 24 hours
    // If the failure is older than retry window, treat as processed to prevent infinite retries
    return ageMs > retryWindowMs;
  }

  return false;
}

/**
 * Record email event in database
 */
export async function recordEmailEvent(params: {
  idempotencyKey: string;
  eventType: string;
  payloadHash: string;
  recipientEmail: string;
  subject: string;
  status?: 'PENDING' | 'SENT' | 'FAILED' | 'SUPPRESSED';
  messageId?: string;
  errorMessage?: string;
}) {
  return prisma.emailEvent.upsert({
    where: { idempotencyKey: params.idempotencyKey },
    create: {
      idempotencyKey: params.idempotencyKey,
      eventType: params.eventType,
      payloadHash: params.payloadHash,
      recipientEmail: params.recipientEmail,
      subject: params.subject,
      status: params.status || 'PENDING',
      messageId: params.messageId,
      errorMessage: params.errorMessage,
      sentAt: params.status === 'SENT' ? new Date() : null,
    },
    update: {
      status: params.status,
      messageId: params.messageId,
      errorMessage: params.errorMessage,
      sentAt: params.status === 'SENT' ? new Date() : null,
    },
  });
}
