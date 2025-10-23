/**
 * Airbnb-style pricing utilities
 * 
 * All calculations use integer pence to avoid floating-point errors.
 * Fee rates are configurable via environment variables.
 * 
 * Formulas:
 * - Net from gross: N = floor(G * (1 - p - s)) - f
 * - Gross from net: G = ceil((N + f) / (1 - p - s))
 * 
 * Where:
 * - G = gross charge in pence
 * - N = net to tradesperson in pence
 * - p = platform fee percentage (e.g., 0.016 for 1.6%)
 * - s = processor fee percentage (e.g., 0.014 for 1.4%)
 * - f = processor fixed fee in pence (e.g., 0)
 */

import { FeeConfig, ChargeBreakdown, PricingBreakdown, PricingInputs } from '@/lib/types/pricing';

/**
 * Get fee configuration from environment or use defaults
 */
export function getFeeConfig(): FeeConfig {
  return {
    platformFeePercentage: parseFloat(process.env.PLATFORM_FEE_PCT || '1.6'),
    processorFeePercentage: parseFloat(process.env.PROCESSOR_FEE_PCT || '1.4'),
    processorFeeFixedPence: parseInt(process.env.PROCESSOR_FEE_FIXED_PENCE || '0', 10),
  };
}

/**
 * Format pence amount to GBP string (e.g., "£1,000.00")
 */
export function formatPence(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pounds);
}

/**
 * Convert GBP pounds to pence (integer)
 */
export function poundsToSafePence(pounds: number): number {
  return Math.round(pounds * 100);
}

/**
 * Convert pence to pounds (for display only, should not be used in calculations)
 */
export function penceToPounds(pence: number): number {
  return pence / 100;
}

/**
 * Compute net from gross (what tradesperson receives from a given customer charge)
 * 
 * Formula: N = floor(G * (1 - p - s)) - f
 */
export function computeNetFromGross(input: {
  grossPence: number;
  platformFeePercentage: number;
  processorFeePercentage: number;
  processorFeeFixedPence: number;
}): ChargeBreakdown {
  const { grossPence, platformFeePercentage, processorFeePercentage, processorFeeFixedPence } = input;

  // Convert percentages to decimals
  const p = platformFeePercentage / 100;
  const s = processorFeePercentage / 100;

  // Calculate fees
  const platformFeePence = Math.floor(grossPence * p);
  const processorFeePence = Math.floor(grossPence * s);
  
  // Net = Gross - platform fee - processor fee - fixed fee
  const netPence = grossPence - platformFeePence - processorFeePence - processorFeeFixedPence;

  return {
    grossPence,
    platformFeePence,
    processorFeePence,
    processorFeeFixedPence,
    netPence,
    grossFormatted: formatPence(grossPence),
    platformFeeFormatted: formatPence(platformFeePence),
    processorFeeFormatted: formatPence(processorFeePence),
    netFormatted: formatPence(netPence),
  };
}

/**
 * Compute gross from net target (what to charge customer so tradesperson receives target net)
 * 
 * Formula: G = ceil((N + f) / (1 - p - s))
 */
export function computeGrossFromNet(input: {
  netTargetPence: number;
  platformFeePercentage: number;
  processorFeePercentage: number;
  processorFeeFixedPence: number;
}): ChargeBreakdown {
  const { netTargetPence, platformFeePercentage, processorFeePercentage, processorFeeFixedPence } = input;

  // Convert percentages to decimals
  const p = platformFeePercentage / 100;
  const s = processorFeePercentage / 100;

  // Calculate gross: G = ceil((N + f) / (1 - p - s))
  const grossPence = Math.ceil((netTargetPence + processorFeeFixedPence) / (1 - p - s));

  // Now compute actual breakdown from this gross
  return computeNetFromGross({
    grossPence,
    platformFeePercentage,
    processorFeePercentage,
    processorFeeFixedPence,
  });
}

/**
 * Compute full pricing breakdown for a quote
 * 
 * Handles both single payment and split payment (deposit + balance) scenarios
 */
export function computePricingBreakdown(input: PricingInputs): PricingBreakdown {
  const feeConfig = getFeeConfig();
  const { mode, amountPence, depositPercentage } = input;

  // Compute the total charge breakdown
  let totalBreakdown: ChargeBreakdown;

  if (mode === 'GROSS') {
    totalBreakdown = computeNetFromGross({
      grossPence: amountPence,
      platformFeePercentage: feeConfig.platformFeePercentage,
      processorFeePercentage: feeConfig.processorFeePercentage,
      processorFeeFixedPence: feeConfig.processorFeeFixedPence,
    });
  } else {
    // mode === 'NET_TARGET'
    totalBreakdown = computeGrossFromNet({
      netTargetPence: amountPence,
      platformFeePercentage: feeConfig.platformFeePercentage,
      processorFeePercentage: feeConfig.processorFeePercentage,
      processorFeeFixedPence: feeConfig.processorFeeFixedPence,
    });
  }

  const breakdown: PricingBreakdown = {
    mode,
    feeConfig,
    computedAt: new Date().toISOString(),
    total: totalBreakdown,
    hasDeposit: false,
  };

  // Handle deposit scenario
  if (depositPercentage && depositPercentage > 0 && depositPercentage < 100) {
    breakdown.hasDeposit = true;
    breakdown.depositPercentage = depositPercentage;

    // Calculate deposit and balance amounts
    const depositGrossPence = Math.round((totalBreakdown.grossPence * depositPercentage) / 100);
    const balanceGrossPence = totalBreakdown.grossPence - depositGrossPence;

    // Compute deposit breakdown
    breakdown.deposit = computeNetFromGross({
      grossPence: depositGrossPence,
      platformFeePercentage: feeConfig.platformFeePercentage,
      processorFeePercentage: feeConfig.processorFeePercentage,
      processorFeeFixedPence: feeConfig.processorFeeFixedPence,
    });

    // Compute balance breakdown
    breakdown.balance = computeNetFromGross({
      grossPence: balanceGrossPence,
      platformFeePercentage: feeConfig.platformFeePercentage,
      processorFeePercentage: feeConfig.processorFeePercentage,
      processorFeeFixedPence: feeConfig.processorFeeFixedPence,
    });
  }

  return breakdown;
}

/**
 * Validate that client-computed pricing matches server calculation
 * Allows for up to 1 penny difference due to rounding
 */
export function validatePricingBreakdown(
  clientBreakdown: { grossPence: number; netPence: number },
  serverBreakdown: ChargeBreakdown
): { valid: boolean; error?: string } {
  const grossDiff = Math.abs(clientBreakdown.grossPence - serverBreakdown.grossPence);
  const netDiff = Math.abs(clientBreakdown.netPence - serverBreakdown.netPence);

  if (grossDiff > 1) {
    return {
      valid: false,
      error: `Gross amount mismatch: client ${clientBreakdown.grossPence}p vs server ${serverBreakdown.grossPence}p`,
    };
  }

  if (netDiff > 1) {
    return {
      valid: false,
      error: `Net amount mismatch: client ${clientBreakdown.netPence}p vs server ${serverBreakdown.netPence}p`,
    };
  }

  return { valid: true };
}
