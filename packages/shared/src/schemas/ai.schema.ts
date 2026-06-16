import { z } from 'zod';

export const ProposalCoachRequestSchema = z.object({
  jobId: z.string().uuid(),
  draftText: z.string().min(20).max(10000),
  tone: z.enum(['formal', 'casual', 'confident', 'friendly']).default('confident'),
  maxLength: z.number().int().min(100).max(5000).default(800),
});
export type ProposalCoachRequestDto = z.infer<typeof ProposalCoachRequestSchema>;

export const ProposalSuggestionSchema = z.object({
  section: z.string(),
  suggestion: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ProposalSuggestion = z.infer<typeof ProposalSuggestionSchema>;

export const ProposalCoachResponseSchema = z.object({
  jobId: z.string().uuid(),
  rewrittenDraft: z.string(),
  suggestions: z.array(ProposalSuggestionSchema),
  estimatedQuality: z.number().int().min(0).max(100),
});
export type ProposalCoachResponse = z.infer<typeof ProposalCoachResponseSchema>;
