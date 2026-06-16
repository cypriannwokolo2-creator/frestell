import { z } from 'zod';

export const JobStatusSchema = z.enum([
  'draft',
  'open',
  'in_progress',
  'submitted',
  'disputed',
  'completed',
  'cancelled',
]);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const AcceptanceCriterionSchema = z.object({
  id: z.string().uuid().optional(),
  description: z.string().min(5).max(500),
  done: z.boolean().default(false),
});
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>;

export const MoneySchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,7})?$/),
  asset: z.enum(['XLM', 'USDC']),
});
export type Money = z.infer<typeof MoneySchema>;

export const CreateJobSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(10000),
  budget: MoneySchema,
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).min(1).max(20),
  deadline: z.string().datetime().optional(),
  tags: z.array(z.string().min(2).max(32)).max(10).optional(),
});
export type CreateJobDto = z.infer<typeof CreateJobSchema>;

export const UpdateJobSchema = CreateJobSchema.partial().extend({
  status: JobStatusSchema.optional(),
});
export type UpdateJobDto = z.infer<typeof UpdateJobSchema>;

export const SubmitJobSchema = z.object({
  acceptanceResults: z.array(
    z.object({ criterionId: z.string().uuid(), done: z.boolean() })
  ),
  notes: z.string().max(2000).optional(),
});
export type SubmitJobDto = z.infer<typeof SubmitJobSchema>;

export const JobSchema = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid(),
  freelancerId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string(),
  budget: MoneySchema,
  status: JobStatusSchema,
  acceptanceCriteria: z.array(AcceptanceCriterionSchema),
  deadline: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Job = z.infer<typeof JobSchema>;
