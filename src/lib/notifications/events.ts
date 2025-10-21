/**
 * Event type definitions for the notification system
 */

import { JobCategory } from '@prisma/client';

export enum EmailEventType {
  USER_REGISTERED = 'UserRegistered',
  JOB_RESPONDED = 'JobResponded',
  JOB_DIGEST_READY = 'JobDigestReady',
  PAYMENT_STATUS_CHANGED = 'PaymentStatusChanged',
  ABUSE_FLAG_RAISED = 'AbuseFlagRaised',
}

export interface UserRegisteredEvent {
  type: EmailEventType.USER_REGISTERED;
  userId: string;
  email: string;
  firstName: string;
  role: 'customer' | 'tradesperson';
}

export interface JobRespondedEvent {
  type: EmailEventType.JOB_RESPONDED;
  jobId: string;
  jobTitle: string;
  customerEmail: string;
  customerName: string;
  tradespersonName: string;
  message: string;
  quote?: number;
}

export interface JobDigestReadyEvent {
  type: EmailEventType.JOB_DIGEST_READY;
  userId: string;
  email: string;
  firstName: string;
  jobs: Array<{
    id: string;
    title: string;
    category: JobCategory;
    location: string;
    budget?: number;
    createdAt: Date;
  }>;
  frequency: 'daily' | 'weekly';
}

export interface PaymentStatusChangedEvent {
  type: EmailEventType.PAYMENT_STATUS_CHANGED;
  jobId: string;
  jobTitle: string;
  userEmail: string;
  userName: string;
  amount: number;
  status: 'succeeded' | 'failed';
  paymentType: 'deposit' | 'final';
}

export interface AbuseFlagRaisedEvent {
  type: EmailEventType.ABUSE_FLAG_RAISED;
  entityType: 'job' | 'message' | 'user';
  entityId: string;
  reportedBy?: string;
  reason: string;
  details: string;
}

export type EmailEvent =
  | UserRegisteredEvent
  | JobRespondedEvent
  | JobDigestReadyEvent
  | PaymentStatusChangedEvent
  | AbuseFlagRaisedEvent;
