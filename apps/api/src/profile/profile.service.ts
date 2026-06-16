import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import type { UpdateProfileDto, PortfolioItemDto, ServiceOfferingDto, SocialLinkDto, ProfileCompleteness, UpdateSlugDto } from './dto/profile.dto';
import { createSlug } from './slug.utils';

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Own Profile ────────────────────────────────────────

  async getMyProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: { include: { skill: true } },
        socialLinks: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.mapOwnProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const data: any = { ...dto };
    if (dto.hourlyRate !== undefined) {
      data.hourlyRate = dto.hourlyRate;
    }
    // Auto-generate slug on first profile update if not set
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { slug: true, displayName: true, email: true } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.slug && data.displayName) {
      data.slug = await this.generateUniqueSlug(data.displayName);
    } else if (!user.slug && !data.displayName) {
      data.slug = await this.generateUniqueSlug(user.email!.split('@')[0]);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      include: {
        skills: { include: { skill: true } },
        socialLinks: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return this.mapOwnProfile(updated);
  }

  async updateSlug(userId: string, dto: UpdateSlugDto) {
    const slug = dto.slug.toLowerCase().trim();
    // Check if slug is already taken by another user
    const existing = await this.prisma.user.findUnique({ where: { slug } });
    if (existing && existing.id !== userId) {
      throw new ConflictException('This username is already taken');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { slug } });
    return { slug };
  }

  async checkSlugAvailable(slug: string) {
    const existing = await this.prisma.user.findUnique({ where: { slug } });
    return { available: !existing };
  }

  // ─── Public Profile ─────────────────────────────────────

  async getPublicProfile(slug: string) {
    const user = await this.prisma.user.findUnique({
      where: { slug },
      include: {
        skills: { include: { skill: true }, orderBy: { endorsements: 'desc' } },
        portfolioItems: { orderBy: { sortOrder: 'asc' } },
        serviceOfferings: { orderBy: { sortOrder: 'asc' } },
        socialLinks: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!user || user.deletedAt) throw new NotFoundException('Profile not found');
    if (user.profileVisibility === 'hidden') throw new NotFoundException('Profile not found');

    return this.mapPublicProfile(user);
  }

  // ─── Portfolio ──────────────────────────────────────────

  async listPortfolio(userId: string) {
    return this.prisma.portfolioItem.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addPortfolioItem(userId: string, dto: PortfolioItemDto) {
    const maxSort = await this.prisma.portfolioItem.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    return this.prisma.portfolioItem.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        images: dto.images ?? [],
        liveUrl: dto.liveUrl ?? null,
        githubUrl: dto.githubUrl ?? null,
        completionDate: dto.completionDate ? new Date(dto.completionDate) : null,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updatePortfolioItem(userId: string, itemId: string, dto: PortfolioItemDto) {
    const item = await this.prisma.portfolioItem.findFirst({ where: { id: itemId, userId } });
    if (!item) throw new NotFoundException('Portfolio item not found');
    return this.prisma.portfolioItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        description: dto.description ?? null,
        images: dto.images ?? [],
        liveUrl: dto.liveUrl ?? null,
        githubUrl: dto.githubUrl ?? null,
        completionDate: dto.completionDate ? new Date(dto.completionDate) : null,
      },
    });
  }

  async deletePortfolioItem(userId: string, itemId: string) {
    const item = await this.prisma.portfolioItem.findFirst({ where: { id: itemId, userId } });
    if (!item) throw new NotFoundException('Portfolio item not found');
    await this.prisma.portfolioItem.delete({ where: { id: itemId } });
  }

  // ─── Services ───────────────────────────────────────────

  async listServices(userId: string) {
    return this.prisma.serviceOffering.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addService(userId: string, dto: ServiceOfferingDto) {
    const maxSort = await this.prisma.serviceOffering.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    return this.prisma.serviceOffering.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description ?? null,
        rateMin: dto.rateMin,
        rateMax: dto.rateMax ?? null,
        currency: dto.currency ?? 'USD',
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateService(userId: string, serviceId: string, dto: ServiceOfferingDto) {
    const svc = await this.prisma.serviceOffering.findFirst({ where: { id: serviceId, userId } });
    if (!svc) throw new NotFoundException('Service not found');
    return this.prisma.serviceOffering.update({
      where: { id: serviceId },
      data: {
        title: dto.title,
        description: dto.description ?? null,
        rateMin: dto.rateMin,
        rateMax: dto.rateMax ?? null,
        currency: dto.currency ?? 'USD',
      },
    });
  }

  async deleteService(userId: string, serviceId: string) {
    const svc = await this.prisma.serviceOffering.findFirst({ where: { id: serviceId, userId } });
    if (!svc) throw new NotFoundException('Service not found');
    await this.prisma.serviceOffering.delete({ where: { id: serviceId } });
  }

  // ─── Skills ─────────────────────────────────────────────

  async getSkills() {
    return this.prisma.skill.findMany({ orderBy: { category: 'asc' } });
  }

  async searchSkills(q: string) {
    return this.prisma.skill.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  async getUserSkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { endorsements: 'desc' },
    });
  }

  async addSkill(userId: string, skillId: string) {
    const skill = await this.prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) throw new NotFoundException('Skill not found');
    const existing = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (existing) throw new ConflictException('Skill already added');
    return this.prisma.userSkill.create({
      data: { userId, skillId },
      include: { skill: true },
    });
  }

  async removeSkill(userId: string, skillId: string) {
    const us = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
    });
    if (!us) throw new NotFoundException('Skill not found on profile');
    await this.prisma.userSkill.delete({ where: { userId_skillId: { userId, skillId } } });
  }

  async endorseSkill(endorsedUserId: string, skillId: string, endorsedById: string) {
    if (endorsedUserId === endorsedById) throw new BadRequestException('Cannot endorse yourself');

    const skill = await this.prisma.skill.findUnique({ where: { id: skillId } });
    if (!skill) throw new NotFoundException('Skill not found');

    const existing = await this.prisma.skillEndorsement.findUnique({
      where: { skillId_endorsedById_endorsedUserId: { skillId, endorsedById, endorsedUserId: endorsedUserId } },
    });
    if (existing) throw new ConflictException('Already endorsed this skill');

    await this.prisma.$transaction([
      this.prisma.skillEndorsement.create({
        data: { skillId, endorsedById, endorsedUserId },
      }),
      this.prisma.userSkill.update({
        where: { userId_skillId: { userId: endorsedUserId, skillId } },
        data: { endorsements: { increment: 1 } },
      }),
    ]);
  }

  // ─── Social Links ───────────────────────────────────────

  async listSocialLinks(userId: string) {
    return this.prisma.socialLink.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async addSocialLink(userId: string, dto: SocialLinkDto) {
    const existing = await this.prisma.socialLink.findUnique({
      where: { userId_type: { userId, type: dto.type } },
    });
    if (existing) {
      return this.prisma.socialLink.update({
        where: { id: existing.id },
        data: { url: dto.url },
      });
    }
    return this.prisma.socialLink.create({
      data: { userId, type: dto.type, url: dto.url },
    });
  }

  async deleteSocialLink(userId: string, linkId: string) {
    const link = await this.prisma.socialLink.findFirst({ where: { id: linkId, userId } });
    if (!link) throw new NotFoundException('Social link not found');
    await this.prisma.socialLink.delete({ where: { id: linkId } });
  }

  // ─── Availability / Visibility ──────────────────────────

  async updateAvailability(userId: string, status: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { availabilityStatus: status },
      select: { id: true, availabilityStatus: true },
    });
  }

  async updateVisibility(userId: string, visibility: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { profileVisibility: visibility },
      select: { id: true, profileVisibility: true },
    });
  }

  // ─── Completeness Score ─────────────────────────────────

  async getCompleteness(userId: string): Promise<ProfileCompleteness> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        skills: true,
        portfolioItems: { take: 1 },
        socialLinks: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const missing: string[] = [];
    const prompts: string[] = [];

    let score = 0;
    const weights = {
      avatar: 15,
      bio: 15,
      skills: 20,
      displayName: 10,
      title: 10,
      portfolio: 15,
      socialLinks: 10,
      location: 5,
    };
    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);

    if (user.avatarUrl) { score += weights.avatar; } else { missing.push('avatarUrl'); prompts.push('Upload a profile photo to build trust with clients.'); }
    if (user.bio) { score += weights.bio; } else { missing.push('bio'); prompts.push('Write a short bio describing your expertise.'); }
    if (user.skills.length >= 3) { score += weights.skills; } else { missing.push('skills'); prompts.push('Add at least 3 skills to showcase your expertise.'); }
    if (user.displayName) { score += weights.displayName; } else { missing.push('displayName'); prompts.push('Set your display name.'); }
    if (user.title) { score += weights.title; } else { missing.push('title'); prompts.push('Add a professional title (e.g. "Full Stack Developer").'); }
    if (user.portfolioItems.length > 0) { score += weights.portfolio; } else { missing.push('portfolio'); prompts.push('Add at least one portfolio item to showcase your work.'); }
    if (user.socialLinks.length > 0) { score += weights.socialLinks; } else { missing.push('socialLinks'); prompts.push('Link your GitHub, LinkedIn, or other professional profiles.'); }
    if (user.location) { score += weights.location; } else { missing.push('location'); prompts.push('Add your location to help clients find you.'); }

    const finalScore = Math.round((score / totalWeight) * 100);
    return { score: finalScore, missing, prompts };
  }

  // ─── Profile View Tracking ──────────────────────────────

  async trackProfileView(viewedId: string, viewerId?: string, ip?: string) {
    await this.prisma.profileView.create({
      data: { viewedId, viewerId: viewerId ?? null, ip: ip ?? null },
    });
  }

  async getProfileViews(userId: string) {
    const [total, unique, last30] = await Promise.all([
      this.prisma.profileView.count({ where: { viewedId: userId } }),
      this.prisma.profileView.groupBy({
        by: ['viewerId'],
        where: { viewedId: userId, viewerId: { not: null } },
      }),
      this.prisma.profileView.count({
        where: {
          viewedId: userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);
    return { total, uniqueViewers: unique.length, last30Days: last30 };
  }

  // ─── Avatar Upload ──────────────────────────────────────

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    // Store in local uploads folder; path is relative to the API static serve
    const url = `/uploads/avatars/${file.filename}`;
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
    });
    return { avatarUrl: url };
  }

  // ─── Helpers ─────────────────────────────────────────────

  private async generateUniqueSlug(base: string): Promise<string> {
    let slug = createSlug(base);
    let attempts = 0;
    while (await this.prisma.user.findUnique({ where: { slug } })) {
      attempts++;
      slug = `${createSlug(base)}-${attempts}`;
    }
    return slug;
  }

  private mapOwnProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      slug: user.slug,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      title: user.title,
      timezone: user.timezone,
      location: user.location,
      availabilityStatus: user.availabilityStatus,
      profileVisibility: user.profileVisibility,
      hourlyRate: user.hourlyRate ? Number(user.hourlyRate) : null,
      role: user.role,
      tier: user.tier,
      companyName: user.companyName,
      companyIndustry: user.companyIndustry,
      companySize: user.companySize,
      website: user.website,
      skills: (user.skills ?? []).map((us: any) => ({
        id: us.skill.id,
        name: us.skill.name,
        category: us.skill.category,
        endorsements: us.endorsements,
      })),
      socialLinks: (user.socialLinks ?? []).map((sl: any) => ({
        id: sl.id,
        type: sl.type,
        url: sl.url,
      })),
    };
  }

  private mapPublicProfile(user: any) {
    return {
      id: user.id,
      slug: user.slug,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      title: user.title,
      location: user.location,
      timezone: user.timezone,
      availabilityStatus: user.availabilityStatus,
      hourlyRate: user.hourlyRate ? Number(user.hourlyRate) : null,
      role: user.role,
      tier: user.tier,
      companyName: user.companyName,
      companyIndustry: user.companyIndustry,
      website: user.website,
      skills: (user.skills ?? []).map((us: any) => ({
        id: us.skill.id,
        name: us.skill.name,
        category: us.skill.category,
        endorsements: us.endorsements,
      })),
      portfolioItems: (user.portfolioItems ?? []).map((pi: any) => ({
        id: pi.id,
        title: pi.title,
        description: pi.description,
        images: pi.images,
        liveUrl: pi.liveUrl,
        githubUrl: pi.githubUrl,
        completionDate: pi.completionDate?.toISOString() ?? null,
      })),
      serviceOfferings: (user.serviceOfferings ?? []).map((so: any) => ({
        id: so.id,
        title: so.title,
        description: so.description,
        rateMin: Number(so.rateMin),
        rateMax: so.rateMax ? Number(so.rateMax) : null,
        currency: so.currency,
      })),
      socialLinks: (user.socialLinks ?? []).map((sl: any) => ({
        id: sl.id,
        type: sl.type,
        url: sl.url,
      })),
      createdAt: user.createdAt.toISOString(),
    };
  }
}
