import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Decimal } from "@prisma/client/runtime/library"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate deposit amount based on quote and percentage
 * @param quote - The total quote amount
 * @param depositPercentage - The deposit percentage (0-100)
 * @returns The calculated deposit amount
 */
export function calculateDepositAmount(quote: number | Decimal, depositPercentage: number): number {
  return (Number(quote) * depositPercentage) / 100;
}

/**
 * Format currency amount for display
 * @param amount - The amount to format (can be number or Decimal)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string (e.g., "£123.45")
 */
export function formatCurrency(amount: number | Decimal | null | undefined, decimals: number = 2): string {
  if (amount === null || amount === undefined) return "£0.00";
  return `£${Number(amount).toFixed(decimals)}`;
}

/**
 * Validates and sanitizes search query strings
 * @param query - The search query to validate
 * @param minLength - Minimum allowed length (default: 2)
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Sanitized query string or null if invalid
 * @throws Error with message if validation fails
 */
export function validateSearchQuery(
  query: string | null,
  minLength = 2,
  maxLength = 100
): string | null {
  // Return null for empty/null queries
  if (!query) {
    return null;
  }

  // Check maximum length before processing
  if (query.length > maxLength) {
    throw new Error(`Search query too long (max ${maxLength} characters)`);
  }

  // Sanitize special characters (remove HTML tags and trim)
  const sanitized = query
    .replace(/[<>]/g, '') // Remove HTML tag characters
    .trim();

  // Check minimum length after sanitization
  if (sanitized.length < minLength) {
    throw new Error(`Search query too short (min ${minLength} characters)`);
  }

  return sanitized;
}
