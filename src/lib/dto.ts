/**
 * Data Transfer Object (DTO) utilities for serializing Prisma types
 * to plain JSON objects that can be passed to Client Components.
 * 
 * Prisma Decimal objects cannot be serialized across RSC boundaries,
 * so we convert them to strings or numbers.
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert a Prisma Decimal to a string for safe serialization.
 * @param decimal - The Decimal to convert
 * @returns String representation with 2 decimal places
 */
export function decimalToString(decimal: Decimal | null | undefined): string | null {
  if (!decimal) return null;
  return decimal.toFixed(2);
}

/**
 * Convert a Prisma Decimal to a number (in minor units, e.g., pence).
 * @param decimal - The Decimal to convert
 * @returns Number in minor units (e.g., 125.50 -> 12550 pence)
 */
export function decimalToMinorUnits(decimal: Decimal | null | undefined): number | null {
  if (!decimal) return null;
  return decimal.mul(100).toNumber();
}

/**
 * Convert a Prisma Decimal to a plain number.
 * Warning: Use with caution for monetary values due to floating-point precision.
 * @param decimal - The Decimal to convert
 * @returns Number representation
 */
export function decimalToNumber(decimal: Decimal | null | undefined): number | null {
  if (!decimal) return null;
  return decimal.toNumber();
}

/**
 * Serialize an Application for client consumption.
 * Converts Decimal fields to strings/numbers.
 */
export interface SerializedApplication {
  id: string;
  message: string;
  quote: string | null; // Decimal as string
  quoteItems: unknown | null;
  requiresDeposit: boolean;
  depositPercentage: number;
  status: string;
  jobId: string;
  tradespersonId: string;
  createdAt: Date;
  tradesperson: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  job?: {
    id: string;
    title: string;
  };
}

/**
 * Convert a Prisma Application to a serialized format.
 */
export function serializeApplication(application: {
  id: string;
  message: string;
  quote: Decimal | null;
  quoteItems: unknown | null;
  requiresDeposit: boolean;
  depositPercentage: number;
  status: string;
  jobId: string;
  tradespersonId: string;
  createdAt: Date;
  tradesperson: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  job?: {
    id: string;
    title: string;
  };
}): SerializedApplication {
  return {
    id: application.id,
    message: application.message,
    quote: decimalToString(application.quote),
    quoteItems: application.quoteItems,
    requiresDeposit: application.requiresDeposit,
    depositPercentage: application.depositPercentage,
    status: application.status,
    jobId: application.jobId,
    tradespersonId: application.tradespersonId,
    createdAt: application.createdAt,
    tradesperson: application.tradesperson,
    job: application.job,
  };
}
