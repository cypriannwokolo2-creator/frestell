import { z } from 'zod';

const AcceptanceCriterionSchema = z.object({
  description: z.string().min(10).max(500),
  position: z.number().int().nonnegative(),
});

const MilestoneSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  amount: z.number().positive(),
  dueDate: z.string().optional(),
  position: z.number().int().nonnegative().optional(),
});

export const CreateJobDtoSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(50000),
  budgetType: z.enum(['fixed', 'milestone', 'hourly']).default('fixed'),
  budgetAmount: z.number().positive().optional(),
  budgetAsset: z.enum(['XLM', 'USDC']).default('USDC'),
  budgetHoursMin: z.number().positive().optional(),
  budgetHoursMax: z.number().positive().optional(),
  deadline: z.string().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).max(20).optional(),
  milestones: z.array(MilestoneSchema).max(20).optional(),
  categoryId: z.string().uuid().optional(),
  visibility: z.enum(['public', 'invite_only', 'hidden']).optional(),
  applicationLimit: z.number().int().positive().max(200).optional(),
}).refine((data) => {
  if (data.budgetType === 'fixed' && !data.budgetAmount) return false;
  return true;
}, { message: 'budgetAmount is required for fixed-price jobs', path: ['budgetAmount'] })
.refine((data) => {
  if (data.budgetType === 'milestone') {
    if (!data.milestones?.length) return false;
    const total = data.milestones.reduce((s, m) => s + m.amount, 0);
    if (data.budgetAmount && total !== data.budgetAmount) return false;
  }
  return true;
}, { message: 'milestone jobs require at least 1 milestone with total matching budgetAmount', path: ['milestones'] })
.refine((data) => {
  if (data.budgetType === 'hourly') {
    if (!data.budgetHoursMin || !data.budgetHoursMax) return false;
    if (data.budgetHoursMin >= data.budgetHoursMax) return false;
  }
  return true;
}, { message: 'hourly jobs require budgetHoursMin < budgetHoursMax', path: ['budgetHoursMin'] });
export type CreateJobDto = z.infer<typeof CreateJobDtoSchema>;

export const UpdateJobDtoSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(50000).optional(),
  budgetType: z.enum(['fixed', 'milestone', 'hourly']).optional(),
  budgetAmount: z.number().positive().optional(),
  budgetAsset: z.enum(['XLM', 'USDC']).optional(),
  budgetHoursMin: z.number().positive().optional(),
  budgetHoursMax: z.number().positive().optional(),
  deadline: z.string().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  acceptanceCriteria: z.array(AcceptanceCriterionSchema).max(20).optional(),
  milestones: z.array(MilestoneSchema).max(20).optional(),
  categoryId: z.string().uuid().optional(),
  visibility: z.enum(['public', 'invite_only', 'hidden']).optional(),
  applicationLimit: z.number().int().positive().max(200).optional(),
  status: z.enum(['draft', 'review', 'active', 'in_progress', 'completed', 'archived', 'cancelled']).optional(),
}).refine((data) => {
  if (data.budgetType === 'hourly' && data.budgetHoursMin && data.budgetHoursMax && data.budgetHoursMin >= data.budgetHoursMax) return false;
  return true;
}, { message: 'hourly jobs require budgetHoursMin < budgetHoursMax', path: ['budgetHoursMin'] });
export type UpdateJobDto = z.infer<typeof UpdateJobDtoSchema>;

export const CreateProposalDtoSchema = z.object({
  body: z.string().min(10).max(5000),
  bidAmount: z.number().positive(),
  bidAsset: z.enum(['XLM', 'USDC']).default('USDC'),
});
export type CreateProposalDto = z.infer<typeof CreateProposalDtoSchema>;

export const UpdateProposalStatusDtoSchema = z.object({
  status: z.enum(['shortlisted', 'rejected', 'accepted']),
});
export type UpdateProposalStatusDto = z.infer<typeof UpdateProposalStatusDtoSchema>;

export const JobResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  budgetType: z.string(),
  budgetAmount: z.number(),
  budgetAsset: z.string(),
  budgetHoursMin: z.number().nullable(),
  budgetHoursMax: z.number().nullable(),
  status: z.string(),
  visibility: z.string().optional(),
  applicationLimit: z.number().nullable().optional(),
  deadline: z.string().nullable(),
  expiresAt: z.string().nullable().optional(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  categoryId: z.string().nullable().optional(),
  category: z.object({
    id: z.string().uuid(),
    name: z.string(),
    slug: z.string(),
  }).nullable().optional(),
  client: z.object({
    id: z.string().uuid(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  freelancer: z.object({
    id: z.string().uuid(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }).nullable(),
  criteria: z.array(z.object({
    id: z.string().uuid(),
    description: z.string(),
    done: z.boolean(),
    position: z.number(),
  })).optional(),
  milestones: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    amount: z.number(),
    dueDate: z.string().nullable(),
    position: z.number(),
    status: z.string(),
  })).optional(),
  changes: z.array(z.object({
    id: z.string().uuid(),
    field: z.string(),
    oldValue: z.string().nullable(),
    newValue: z.string().nullable(),
    changedBy: z.string(),
    createdAt: z.string(),
  })).optional(),
  proposalsCount: z.number().optional(),
});

export const ProposalResponseSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  bidAmount: z.number(),
  bidAsset: z.string(),
  status: z.string(),
  submittedAt: z.string(),
  updatedAt: z.string(),
  freelancer: z.object({
    id: z.string().uuid(),
    displayName: z.string().nullable(),
    avatarUrl: z.string().nullable(),
  }),
  job: z.object({
    id: z.string().uuid(),
    title: z.string(),
    status: z.string(),
  }).optional(),
});
