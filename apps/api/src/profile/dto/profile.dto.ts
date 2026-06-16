import { z } from 'zod';

export const SocialLinkTypeEnum = z.enum(['github', 'linkedin', 'twitter', 'website', 'other']);

export const UpdateProfileDtoSchema = z.object({
  displayName: z.string().min(2).max(64).optional(),
  bio: z.string().max(500).optional(),
  title: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  availabilityStatus: z.enum(['available', 'unavailable', 'hired']).optional(),
  profileVisibility: z.enum(['public', 'private', 'hidden']).optional(),
  hourlyRate: z.number().positive().optional(),
  companyName: z.string().max(100).optional(),
  companyIndustry: z.string().max(100).optional(),
  companySize: z.string().max(50).optional(),
  website: z.string().url().max(500).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileDtoSchema>;

export const PublicProfileResponseSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().nullable(),
  displayName: z.string().nullable(),
  bio: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  title: z.string().nullable(),
  location: z.string().nullable(),
  timezone: z.string().nullable(),
  availabilityStatus: z.string(),
  hourlyRate: z.number().nullable(),
  role: z.enum(['freelancer', 'client', 'admin']),
  tier: z.enum(['email', 'government_id', 'badges']),
  companyName: z.string().nullable(),
  companyIndustry: z.string().nullable(),
  website: z.string().nullable(),
  skills: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.string(),
    endorsements: z.number().int(),
  })),
  portfolioItems: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    images: z.array(z.string()),
    liveUrl: z.string().nullable(),
    githubUrl: z.string().nullable(),
    completionDate: z.string().nullable(),
  })),
  serviceOfferings: z.array(z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    rateMin: z.number(),
    rateMax: z.number().nullable(),
    currency: z.string(),
  })),
  socialLinks: z.array(z.object({
    id: z.string().uuid(),
    type: z.string(),
    url: z.string(),
  })),
  createdAt: z.string(),
});
export type PublicProfileResponse = z.infer<typeof PublicProfileResponseSchema>;

export const PortfolioItemDtoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  images: z.array(z.string().url()).max(10).default([]),
  liveUrl: z.string().url().max(500).optional(),
  githubUrl: z.string().url().max(500).optional(),
  completionDate: z.string().optional(),
});
export type PortfolioItemDto = z.infer<typeof PortfolioItemDtoSchema>;

export const ServiceOfferingDtoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  rateMin: z.number().positive(),
  rateMax: z.number().positive().optional(),
  currency: z.string().length(3).default('USD'),
});
export type ServiceOfferingDto = z.infer<typeof ServiceOfferingDtoSchema>;

export const SocialLinkDtoSchema = z.object({
  type: SocialLinkTypeEnum,
  url: z.string().url().max(500),
});
export type SocialLinkDto = z.infer<typeof SocialLinkDtoSchema>;

export const UserSkillDtoSchema = z.object({
  skillId: z.string().uuid(),
});
export type UserSkillDto = z.infer<typeof UserSkillDtoSchema>;

export const ProfileCompletenessSchema = z.object({
  score: z.number().int().min(0).max(100),
  missing: z.array(z.string()),
  prompts: z.array(z.string()),
});
export type ProfileCompleteness = z.infer<typeof ProfileCompletenessSchema>;

export const UpdateSlugDtoSchema = z.object({
  slug: z.string().min(3).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
});
export type UpdateSlugDto = z.infer<typeof UpdateSlugDtoSchema>;
