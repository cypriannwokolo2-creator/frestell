import { z } from 'zod';
import { MoneySchema } from './job.schema';

export const EscrowStatusSchema = z.enum(['pending', 'funded', 'released', 'refunded', 'disputed']);
export type EscrowStatus = z.infer<typeof EscrowStatusSchema>;

export const FundEscrowSchema = z.object({
  jobId: z.string().uuid(),
  amount: MoneySchema,
  stellarTxHash: z.string().length(64),
});
export type FundEscrowDto = z.infer<typeof FundEscrowSchema>;

export const ReleaseEscrowSchema = z.object({
  escrowId: z.string().uuid(),
  acceptanceResults: z.array(z.object({ criterionId: z.string().uuid(), done: z.boolean() })),
});
export type ReleaseEscrowDto = z.infer<typeof ReleaseEscrowSchema>;

export const DisputeEscrowSchema = z.object({
  escrowId: z.string().uuid(),
  reason: z.string().min(20).max(2000),
  evidence: z.array(z.string().url()).max(20).optional(),
});
export type DisputeEscrowDto = z.infer<typeof DisputeEscrowSchema>;

export const EscrowSchema = z.object({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  contractId: z.string(),
  amount: MoneySchema,
  status: EscrowStatusSchema,
  fundedAt: z.string().datetime().nullable(),
  releasedAt: z.string().datetime().nullable(),
});
export type Escrow = z.infer<typeof EscrowSchema>;
