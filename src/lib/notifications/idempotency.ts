/**
 * Idempotency service for email sending
 * Uses SHA-256 hash to prevent duplicate email sends
 */

import { createHash } from 'crypto';
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
  
  return existingEvent?.status === 'SENT' || existingEvent?.status === 'PENDING';
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
