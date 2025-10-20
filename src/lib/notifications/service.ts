/**
 * Notification service - coordinates event emission and email sending
 */

import React from 'react';
import { resend, FROM_EMAIL } from '@/lib/resend';
import {
  EmailEvent,
  EmailEventType,
  UserRegisteredEvent,
  JobRespondedEvent,
  JobDigestReadyEvent,
  AbuseFlagRaisedEvent,
} from './events';
import {
  generateIdempotencyKey,
  generatePayloadHash,
  isEventProcessed,
  recordEmailEvent,
} from './idempotency';
import { isEmailSuppressed } from './suppressions';
import {
  WelcomeEmail,
  JobResponseEmail,
  DigestEmail,
  SupportAlertEmail,
} from '@/lib/emails/templates';
import {
  generateWelcomeEmailPlainText,
  generateJobResponseEmailPlainText,
  generateDigestEmailPlainText,
  generateSupportAlertEmailPlainText,
} from './plain-text';

const FRONTEND_BASE_URL = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
const SUPPORT_TEAM_EMAIL = process.env.SUPPORT_TEAM_EMAIL || 'support@needatradesman.co.uk';

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Main function to emit email events with idempotency
 */
export async function emitEmailEvent(event: EmailEvent): Promise<SendEmailResult> {
  try {
    const idempotencyKey = generateIdempotencyKey(event);
    const payloadHash = generatePayloadHash(event);

    // Check if event was already processed
    if (await isEventProcessed(idempotencyKey)) {
      console.log(`[Email] Event already processed: ${idempotencyKey}`);
      return { success: true };
    }

    // Route to appropriate handler
    switch (event.type) {
      case EmailEventType.USER_REGISTERED:
        return await handleUserRegistered(event, idempotencyKey, payloadHash);
      case EmailEventType.JOB_RESPONDED:
        return await handleJobResponded(event, idempotencyKey, payloadHash);
      case EmailEventType.JOB_DIGEST_READY:
        return await handleJobDigest(event, idempotencyKey, payloadHash);
      case EmailEventType.ABUSE_FLAG_RAISED:
        return await handleAbuseFlagRaised(event, idempotencyKey, payloadHash);
      default:
        console.error(`[Email] Unknown event type:`, event);
        return { success: false, error: 'Unknown event type' };
    }
  } catch (error) {
    console.error('[Email] Error emitting event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Handle UserRegistered event - send welcome email
 */
async function handleUserRegistered(
  event: UserRegisteredEvent,
  idempotencyKey: string,
  payloadHash: string
): Promise<SendEmailResult> {
  // Check if email is suppressed
  if (await isEmailSuppressed(event.email)) {
    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.email,
      subject: 'Welcome to Need a Tradesman!',
      status: 'SUPPRESSED',
    });
    return { success: true };
  }

  const subject = 'Welcome to Need a Tradesman!';
  const dashboardUrl = `${FRONTEND_BASE_URL}/dashboard`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: event.email,
      subject,
      react: React.createElement(WelcomeEmail, {
        userName: event.firstName,
        userRole: event.role,
        dashboardUrl,
      }),
      text: generateWelcomeEmailPlainText({
        userName: event.firstName,
        userRole: event.role,
        dashboardUrl,
      }),
      headers: {
        'X-Correlation-ID': idempotencyKey,
      },
    });

    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.email,
      subject,
      status: 'SENT',
      messageId: result.data?.id,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.email,
      subject,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle JobResponded event - notify customer of new application
 */
async function handleJobResponded(
  event: JobRespondedEvent,
  idempotencyKey: string,
  payloadHash: string
): Promise<SendEmailResult> {
  if (await isEmailSuppressed(event.customerEmail)) {
    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.customerEmail,
      subject: `New Application for "${event.jobTitle}"`,
      status: 'SUPPRESSED',
    });
    return { success: true };
  }

  const subject = `New Application for "${event.jobTitle}"`;
  const jobUrl = `${FRONTEND_BASE_URL}/dashboard/my-jobs/${event.jobId}`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: event.customerEmail,
      subject,
      react: React.createElement(JobResponseEmail, {
        customerName: event.customerName,
        tradespersonName: event.tradespersonName,
        jobTitle: event.jobTitle,
        message: event.message,
        quote: event.quote,
        jobUrl,
      }),
      text: generateJobResponseEmailPlainText({
        customerName: event.customerName,
        tradespersonName: event.tradespersonName,
        jobTitle: event.jobTitle,
        message: event.message,
        quote: event.quote,
        jobUrl,
      }),
      headers: {
        'X-Correlation-ID': idempotencyKey,
      },
    });

    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.customerEmail,
      subject,
      status: 'SENT',
      messageId: result.data?.id,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.customerEmail,
      subject,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle JobDigestReady event - send digest email
 */
async function handleJobDigest(
  event: JobDigestReadyEvent,
  idempotencyKey: string,
  payloadHash: string
): Promise<SendEmailResult> {
  if (await isEmailSuppressed(event.email)) {
    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.email,
      subject: `Your ${event.frequency} Job Digest`,
      status: 'SUPPRESSED',
    });
    return { success: true };
  }

  const subject = `Your ${event.frequency === 'daily' ? 'Daily' : 'Weekly'} Job Digest - ${event.jobs.length} New Jobs`;
  const viewAllUrl = `${FRONTEND_BASE_URL}/dashboard/jobs`;
  const managePreferencesUrl = `${FRONTEND_BASE_URL}/dashboard/settings/email`;
  const unsubscribeUrl = `${FRONTEND_BASE_URL}/api/emails/unsubscribe?userId=${event.userId}&type=digest`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: event.email,
      subject,
      react: React.createElement(DigestEmail, {
        firstName: event.firstName,
        jobs: event.jobs.map(job => ({
          ...job,
          category: job.category.toString(),
        })),
        frequency: event.frequency,
        viewAllUrl,
        managePreferencesUrl,
        unsubscribeUrl,
      }),
      text: generateDigestEmailPlainText({
        firstName: event.firstName,
        jobCount: event.jobs.length,
        jobs: event.jobs.map(job => ({
          title: job.title,
          location: job.location,
          budget: job.budget,
          category: job.category.toString(),
        })),
        frequency: event.frequency,
        viewAllUrl,
        managePreferencesUrl,
        unsubscribeUrl,
      }),
      headers: {
        'X-Correlation-ID': idempotencyKey,
        'List-Unsubscribe': `<mailto:${SUPPORT_TEAM_EMAIL}?subject=Unsubscribe>, <${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });

    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.email,
      subject,
      status: 'SENT',
      messageId: result.data?.id,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: event.email,
      subject,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Handle AbuseFlagRaised event - send alert to support team
 */
async function handleAbuseFlagRaised(
  event: AbuseFlagRaisedEvent,
  idempotencyKey: string,
  payloadHash: string
): Promise<SendEmailResult> {
  const subject = `⚠️ Abuse Flag Raised - ${event.entityType} ${event.entityId}`;
  const adminUrl = `${FRONTEND_BASE_URL}/admin/${event.entityType}s/${event.entityId}`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: SUPPORT_TEAM_EMAIL,
      subject,
      react: React.createElement(SupportAlertEmail, {
        entityType: event.entityType,
        entityId: event.entityId,
        reason: event.reason,
        details: event.details,
        reportedBy: event.reportedBy,
        adminUrl,
      }),
      text: generateSupportAlertEmailPlainText({
        entityType: event.entityType,
        entityId: event.entityId,
        reason: event.reason,
        details: event.details,
        reportedBy: event.reportedBy,
        adminUrl,
      }),
      headers: {
        'X-Correlation-ID': idempotencyKey,
        'X-Priority': '1',
        'Importance': 'high',
      },
    });

    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: SUPPORT_TEAM_EMAIL,
      subject,
      status: 'SENT',
      messageId: result.data?.id,
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    await recordEmailEvent({
      idempotencyKey,
      eventType: event.type,
      payloadHash,
      recipientEmail: SUPPORT_TEAM_EMAIL,
      subject,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
