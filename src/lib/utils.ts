import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
