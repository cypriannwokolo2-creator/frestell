import { z } from 'zod';

export const VerificationTierSchema = z.enum(['email', 'government_id', 'badges']);
export type VerificationTier = z.infer<typeof VerificationTierSchema>;

export const UserPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  tier: VerificationTierSchema,
  stellarAddress: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type UserPublic = z.infer<typeof UserPublicSchema>;

export const UpdateUserSchema = z.object({
  displayName: z.string().min(2).max(64).optional(),
  stellarAddress: z.string().startsWith('G').length(56).optional(),
});
export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const GovernmentIdSubmissionSchema = z.object({
  fullName: z.string().min(2).max(128),
  country: z.string().length(2),
  documentType: z.enum(['passport', 'national_id', 'driver_license']),
  documentNumber: z.string().min(4).max(64),
  documentImageBase64: z.string().min(100),
});
export type GovernmentIdSubmissionDto = z.infer<typeof GovernmentIdSubmissionSchema>;
