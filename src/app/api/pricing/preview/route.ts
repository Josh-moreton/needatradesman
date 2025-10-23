import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { computePricingBreakdown } from '@/lib/pricing';
import { createLogger } from '@/lib/logger';

const logger = createLogger('pricing-preview');

// Validation schema for pricing preview request
const pricingPreviewSchema = z.object({
  mode: z.enum(['GROSS', 'NET_TARGET'], {
    errorMap: () => ({ message: 'Mode must be either GROSS or NET_TARGET' }),
  }),
  amountPence: z.number().int().positive({
    message: 'Amount must be a positive integer in pence',
  }),
  depositPercentage: z.number().int().min(0).max(100).optional(),
});

/**
 * POST /api/pricing/preview
 * 
 * Compute authoritative pricing breakdown for quote builder
 * 
 * Request body:
 * - mode: 'GROSS' | 'NET_TARGET'
 * - amountPence: number (integer, positive)
 * - depositPercentage?: number (0-100, optional)
 * 
 * Response:
 * - Complete PricingBreakdown with fee calculations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = pricingPreviewSchema.safeParse(body);
    if (!validation.success) {
      logger.warn({ errors: validation.error.errors }, 'Invalid pricing preview request');
      return NextResponse.json(
        {
          success: false,
          error: validation.error.errors[0]?.message || 'Invalid request',
        },
        { status: 400 }
      );
    }

    const { mode, amountPence, depositPercentage } = validation.data;

    // Compute pricing breakdown
    const breakdown = computePricingBreakdown({
      mode,
      amountPence,
      depositPercentage,
    });

    logger.info(
      {
        mode,
        amountPence,
        depositPercentage,
        grossPence: breakdown.total.grossPence,
        netPence: breakdown.total.netPence,
      },
      'Pricing preview computed'
    );

    return NextResponse.json({
      success: true,
      ...breakdown,
    });
  } catch (error) {
    logger.error({ error }, 'Error computing pricing preview');
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compute pricing preview',
      },
      { status: 500 }
    );
  }
}
