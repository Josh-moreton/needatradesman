/**
 * Feature flags configuration
 * 
 * Simple feature flag system for controlling feature rollout.
 * Flags can be enabled via environment variables.
 */

export interface FeatureFlags {
  airbnbPricing: boolean;
}

/**
 * Get feature flags from environment
 */
export function getFeatureFlags(): FeatureFlags {
  return {
    airbnbPricing: process.env.NEXT_PUBLIC_FEATURE_AIRBNB_PRICING === 'true',
  };
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] === true;
}

/**
 * Client-side hook to get feature flags
 * Can be used in client components
 */
export function useFeatureFlags(): FeatureFlags {
  return getFeatureFlags();
}
