import { z } from 'zod';

// Repayment process parameters
export interface RepaymentParams {
  tokenId: string;
  pawnshopAccountId?: string;
  amountCTC?: string;
}

// Request schema for repayment API
export const RepaymentRequestSchema = z.object({
  tokenId: z.string().min(1, 'Token ID is required'),
  sagId: z.string().optional(),
  amountCTC: z.union([z.string(), z.number()]).optional(),
  pawnshopAccountId: z.string().optional(),
});

// Response schema for repayment API
export const RepaymentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  data: z.object({
    jobId: z.string(),
    status: z.string(),
    tokenId: z.string(),
    transactionHash: z.string().optional(),
    blockNumber: z.number().optional(),
    repaidAmountCTC: z.string().optional(),
    timestamp: z.string(),
  }).optional(),
  error: z.string().optional(),
});

// Type definitions
export type RepaymentRequest = z.infer<typeof RepaymentRequestSchema>;
export type RepaymentResponse = z.infer<typeof RepaymentResponseSchema>;
