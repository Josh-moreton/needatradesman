/**
 * Feature flags configuration
 * Environment-based configuration for feature toggles
 */

export const FEATURES = {
    // Bank Transfer Configuration
    BANK_TRANSFER_ENABLED: process.env.BANK_TRANSFER_ENABLED === 'true' || true, // Default enabled
    BANK_TRANSFER_MIN_AMOUNT: parseInt(process.env.BANK_TRANSFER_MIN_AMOUNT || '5000', 10), // £50.00 minimum in pence
    
    // Bank Account Details (for display to customers)
    // These should be configured in production via environment variables
    BANK_TRANSFER_ACCOUNT_NAME: process.env.BANK_TRANSFER_ACCOUNT_NAME || 'Need A Tradesman Ltd',
    BANK_TRANSFER_SORT_CODE: process.env.BANK_TRANSFER_SORT_CODE || 'XX-XX-XX',
    BANK_TRANSFER_ACCOUNT_NUMBER: process.env.BANK_TRANSFER_ACCOUNT_NUMBER || 'XXXXXXXX',
} as const;

/**
 * Check if bank transfer is available for a given amount
 * @param amountInPence Amount in pence (smallest currency unit)
 * @returns boolean indicating if bank transfer should be offered
 */
export function isBankTransferAvailable(amountInPence: number): boolean {
    return FEATURES.BANK_TRANSFER_ENABLED && amountInPence >= FEATURES.BANK_TRANSFER_MIN_AMOUNT;
}

/**
 * Generate unique bank transfer reference for a job
 * Format: NAT-JOB-{SHORT_ID}
 * Max 18 chars for BACS reference field
 * @param jobId The job ID
 * @returns Unique reference string
 */
export function generateBankTransferReference(jobId: string): string {
    // Take first 8 characters of job ID and convert to uppercase
    const shortId = jobId.substring(0, 8).toUpperCase();
    return `NAT-JOB-${shortId}`;
}
