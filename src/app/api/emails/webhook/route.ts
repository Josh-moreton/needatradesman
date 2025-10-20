/**
 * Resend webhook endpoint
 * Handles email events like bounces and complaints
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { suppressEmail } from '@/lib/notifications/suppressions';
import { createLogger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

const logger = createLogger('resend-webhook-api');

/**
 * Verify Resend webhook signature
 * Note: Resend uses Svix for webhook signatures
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string | null
): Promise<boolean> {
  // If no webhook secret is configured, skip verification in development
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    logger.warn('RESEND_WEBHOOK_SECRET not configured - skipping signature verification');
    return true;
  }

  if (!signature) {
    return false;
  }

  // Resend uses Svix webhooks - you can use the svix library for verification
  // For now, we'll do basic verification
  // In production, use: import { Webhook } from 'svix';
  // const wh = new Webhook(webhookSecret);
  // wh.verify(payload, headers);
  
  return true; // TODO: Implement proper Svix verification
}

/**
 * POST /api/emails/webhook
 * Handle Resend webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const headersList = await headers();
    const signature = headersList.get('svix-signature');
    
    const payload = await request.text();
    
    // Verify webhook signature
    const isValid = await verifyWebhookSignature(payload, signature);
    if (!isValid) {
      logger.error('Invalid webhook signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(payload);
    
    logger.info({ type: event.type }, 'Received Resend webhook event');

    // Handle different event types
    switch (event.type) {
      case 'email.bounced':
        await handleEmailBounced(event.data);
        break;
      
      case 'email.complained':
        await handleEmailComplained(event.data);
        break;
      
      case 'email.delivered':
        await handleEmailDelivered(event.data);
        break;
      
      case 'email.opened':
      case 'email.clicked':
        // Optional: track engagement metrics
        break;
      
      default:
        logger.info({ type: event.type }, 'Unhandled webhook event type');
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Error processing Resend webhook');
    return new NextResponse('Internal server error', { status: 500 });
  }
}

/**
 * Handle email bounce event
 */
async function handleEmailBounced(data: { to?: string[]; email?: string; bounce_type?: string }) {
  const email = data.to?.[0] || data.email;
  
  if (!email) {
    logger.error({ data }, 'No email address in bounce event');
    return;
  }

  logger.warn({ email, reason: data.bounce_type }, 'Email bounced');

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Add to suppression list
  await suppressEmail({
    email,
    userId: user?.id,
    reason: 'BOUNCE',
    source: 'resend_webhook',
  });

  logger.info({ email }, 'Email added to bounce suppression list');
}

/**
 * Handle email complaint (spam report)
 */
async function handleEmailComplained(data: { to?: string[]; email?: string }) {
  const email = data.to?.[0] || data.email;
  
  if (!email) {
    logger.error({ data }, 'No email address in complaint event');
    return;
  }

  logger.warn({ email }, 'Email complaint received');

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Add to suppression list
  await suppressEmail({
    email,
    userId: user?.id,
    reason: 'COMPLAINT',
    source: 'resend_webhook',
  });

  logger.info({ email }, 'Email added to complaint suppression list');
}

/**
 * Handle email delivered event (optional tracking)
 */
async function handleEmailDelivered(data: { to?: string[]; email?: string; email_id?: string }) {
  const email = data.to?.[0] || data.email;
  const messageId = data.email_id;

  logger.debug({ email, messageId }, 'Email delivered successfully');

  // Optional: Update email event status in database
  if (messageId) {
    await prisma.emailEvent.updateMany({
      where: { messageId },
      data: { status: 'SENT' },
    });
  }
}
