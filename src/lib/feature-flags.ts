/**
 * Feature flags for gradual rollout of new features
 */

export const FEATURES = {
  /**
   * USE_SC_AND_T: Enable Separate Charges & Transfers payment model
   * 
   * When false (default): Uses Destination Charges (instant transfer via transfer_data)
   * When true: Uses SC&T (charge platform account, transfer manually later)
   * 
   * SC&T Benefits:
   * - Payout control (24-48h cooling-off period)
   * - Milestone payment support
   * - Better customer protection (refund before transfer = no tradesperson impact)
   * - Improved reconciliation via transfer_group
   */
  USE_SC_AND_T: process.env.FEATURE_SC_AND_T === 'true',
} as const;
