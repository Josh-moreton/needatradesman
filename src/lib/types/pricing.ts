/**
 * Pricing types for Airbnb-style pricing model
 * All monetary values are stored as integers in pence to avoid floating-point errors
 */

/**
 * Fee configuration from environment or defaults
 */
export interface FeeConfig {
  platformFeePercentage: number; // e.g., 1.6 (for 1.6%)
  processorFeePercentage: number; // e.g., 1.4 (for 1.4%)
  processorFeeFixedPence: number; // e.g., 0 or 20 (for fixed per-transaction fee)
}

/**
 * Input for pricing calculations
 */
export interface PricingInputs {
  mode: 'GROSS' | 'NET_TARGET';
  amountPence: number; // Gross amount or net target amount in pence
  depositPercentage?: number; // Optional deposit percentage (0-100)
}

/**
 * Detailed breakdown of fees and amounts for a single charge
 */
export interface ChargeBreakdown {
  grossPence: number; // Total amount charged to customer
  platformFeePence: number; // Platform fee amount
  processorFeePence: number; // Processor fee amount
  processorFeeFixedPence: number; // Fixed processor fee
  netPence: number; // Net amount to tradesperson
  grossFormatted: string; // e.g., "£1,000.00"
  platformFeeFormatted: string;
  processorFeeFormatted: string;
  netFormatted: string;
}

/**
 * Complete pricing breakdown including deposit and balance (if applicable)
 */
export interface PricingBreakdown {
  mode: 'GROSS' | 'NET_TARGET';
  feeConfig: FeeConfig;
  computedAt: string; // ISO timestamp
  
  // Single payment scenario
  total: ChargeBreakdown;
  
  // Split payment scenario (deposit + balance)
  deposit?: ChargeBreakdown;
  balance?: ChargeBreakdown;
  
  // Metadata
  depositPercentage?: number;
  hasDeposit: boolean;
}

/**
 * Request body for pricing preview API
 */
export interface PricingPreviewRequest {
  mode: 'GROSS' | 'NET_TARGET';
  amountPence: number;
  depositPercentage?: number;
}

/**
 * Response from pricing preview API
 */
export interface PricingPreviewResponse extends PricingBreakdown {
  success: boolean;
  error?: string;
}

/**
 * Pricing snapshot stored with applications
 */
export interface PricingSnapshot {
  grossPence: number;
  netPence: number;
  platformFeePence: number;
  processorFeePence: number;
  processorFeeFixedPence: number;
  feeRates: {
    platform: number;
    processor: number;
    processorFixed: number;
  };
  computedAt: string;
  depositPercentage?: number;
}
