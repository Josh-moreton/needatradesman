/**
 * Application-wide constants for pagination and other configurable values
 */

export const PAGINATION = {
  // Jobs pagination
  JOBS_PER_PAGE: 12,
  MAX_JOBS_PER_PAGE: 50,
  MIN_JOBS_PER_PAGE: 6,
  
  // Applications pagination (currently not paginated but reserved for future use)
  APPLICATIONS_PER_PAGE: 20,
  MAX_APPLICATIONS_PER_PAGE: 100,
  MIN_APPLICATIONS_PER_PAGE: 10,
  
  // Messages pagination (currently not paginated but reserved for future use)
  MESSAGES_PER_PAGE: 50,
  MAX_MESSAGES_PER_PAGE: 200,
  MIN_MESSAGES_PER_PAGE: 20,
} as const;
