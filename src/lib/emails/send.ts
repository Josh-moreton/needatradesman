import React from 'react';
import { resend, FROM_EMAIL } from '../resend';
import {
    NewApplicationEmail,
    JobStatusUpdateEmail,
    NewMessageEmail,
    PaymentConfirmationEmail,
    WelcomeEmail,
} from './templates';

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface SendEmailResult {
    success: boolean;
    error?: string;
}

/**
 * Send email notification when a tradesperson applies to a job
 */
export async function sendNewApplicationEmail(params: {
    customerEmail: string;
    customerName: string;
    tradespersonName: string;
    jobId: string;
    jobTitle: string;
    message: string;
    quote?: number;
}): Promise<SendEmailResult> {
    try {
        const { customerEmail, customerName, tradespersonName, jobId, jobTitle, message, quote } = params;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: customerEmail,
            subject: `New Application for "${jobTitle}"`,
            react: React.createElement(NewApplicationEmail, {
                customerName,
                tradespersonName,
                jobTitle,
                message,
                quote: quote?.toString(),
                jobUrl: `${BASE_URL}/dashboard/my-jobs/${jobId}`,
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending new application email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Send email notification when job status changes
 */
export async function sendJobStatusUpdateEmail(params: {
    userEmail: string;
    userName: string;
    jobId: string;
    jobTitle: string;
    status: string;
    message: string;
}): Promise<SendEmailResult> {
    try {
        const { userEmail, userName, jobId, jobTitle, status, message } = params;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: `Job Status Update: ${jobTitle}`,
            react: React.createElement(JobStatusUpdateEmail, {
                userName,
                jobTitle,
                status,
                message,
                jobUrl: `${BASE_URL}/dashboard/jobs/${jobId}`,
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending job status update email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Send email notification for new messages
 */
export async function sendNewMessageEmail(params: {
    recipientEmail: string;
    recipientName: string;
    senderName: string;
    jobId: string;
    jobTitle: string;
    messagePreview: string;
}): Promise<SendEmailResult> {
    try {
        const { recipientEmail, recipientName, senderName, jobId, jobTitle, messagePreview } = params;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: recipientEmail,
            subject: `New message from ${senderName}`,
            react: React.createElement(NewMessageEmail, {
                recipientName,
                senderName,
                jobTitle,
                messagePreview: messagePreview.slice(0, 150), // Truncate preview
                conversationUrl: `${BASE_URL}/dashboard/messages?jobId=${jobId}`,
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending new message email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Send payment confirmation email
 */
export async function sendPaymentConfirmationEmail(params: {
    userEmail: string;
    userName: string;
    jobId: string;
    jobTitle: string;
    amount: number;
    paymentType: 'deposit' | 'final';
}): Promise<SendEmailResult> {
    try {
        const { userEmail, userName, jobId, jobTitle, amount, paymentType } = params;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: `Payment Confirmation - ${jobTitle}`,
            react: React.createElement(PaymentConfirmationEmail, {
                userName,
                jobTitle,
                amount: amount.toFixed(2),
                paymentType,
                jobUrl: `${BASE_URL}/dashboard/jobs/${jobId}`,
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending payment confirmation email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(params: {
    userEmail: string;
    userName: string;
    userRole: 'customer' | 'tradesperson';
}): Promise<SendEmailResult> {
    try {
        const { userEmail, userName, userRole } = params;

        await resend.emails.send({
            from: FROM_EMAIL,
            to: userEmail,
            subject: 'Welcome to Need a Tradesman!',
            react: React.createElement(WelcomeEmail, {
                userName,
                userRole,
                dashboardUrl: `${BASE_URL}/dashboard`,
            }),
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
