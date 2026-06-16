import {
  Injectable, NotFoundException, ForbiddenException, ConflictException,
  BadRequestException, Logger, StreamableFile,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.module';
import { EmailService } from '../email/email.service';
import type { CreateJobDto, UpdateJobDto, CreateProposalDto, UpdateProposalStatusDto } from './dto/jobs.dto';
import { existsSync, mkdirSync, unlinkSync, createReadStream } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Create Job ─────────────────────────────────────────

  async createJob(clientId: string, dto: CreateJobDto) {
    const data: any = {
      clientId,
      title: dto.title,
      description: dto.description,
      budgetType: dto.budgetType,
      budgetAsset: dto.budgetAsset,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      tags: dto.tags ?? [],
      status: 'draft',
      publishedAt: null,
      visibility: dto.visibility ?? 'public',
      applicationLimit: dto.applicationLimit ?? 50,
    };

    if (dto.categoryId) data.categoryId = dto.categoryId;

    if (dto.budgetType === 'fixed') {
      data.budgetAmount = dto.budgetAmount ?? 0;
    } else if (dto.budgetType === 'milestone') {
      data.budgetAmount = dto.budgetAmount ?? 0;
      if (dto.milestones?.length) {
        data.milestones = {
          create: dto.milestones.map((m, i) => ({
            title: m.title,
            description: m.description,
            amount: m.amount,
            dueDate: m.dueDate ? new Date(m.dueDate) : null,
            position: m.position ?? i,
          })),
        };
      }
    } else {
      data.budgetAmount = 0;
      data.budgetHoursMin = dto.budgetHoursMin;
      data.budgetHoursMax = dto.budgetHoursMax;
    }

    if (dto.acceptanceCriteria?.length) {
      data.criteria = {
        create: dto.acceptanceCriteria.map((c, i) => ({
          description: c.description,
          position: c.position ?? i,
        })),
      };
    }

    const job = await this.prisma.job.create({
      data,
      include: {
        client: { select: { id: true, displayName: true, avatarUrl: true } },
        criteria: { orderBy: { position: 'asc' } },
        milestones: { orderBy: { position: 'asc' } },
        category: true,
      },
    });
    return this.mapJob(job);
  }

  // ─── Publish Job ────────────────────────────────────────

  async publishJob(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        _count: { select: { criteria: true, milestones: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');
    if (job.status !== 'draft') throw new BadRequestException('Job is not in draft status');

    if (job._count.criteria < 3) {
      throw new BadRequestException('Job must have at least 3 acceptance criteria before publishing');
    }

    if (job.budgetType === 'milestone' && job._count.milestones < 1) {
      throw new BadRequestException('Milestone-based jobs require at least 1 milestone');
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: { status: 'active', publishedAt: new Date() },
      include: {
        client: { select: { id: true, displayName: true, avatarUrl: true } },
        criteria: { orderBy: { position: 'asc' } },
        milestones: { orderBy: { position: 'asc' } },
        category: true,
      },
    });
    return this.mapJob(updated);
  }

  // ─── List Active Jobs (for freelancers) ─────────────────

  async listActiveJobs() {
    const now = new Date();
    // Auto-expire past-deadline jobs
    await this.prisma.job.updateMany({
      where: { status: 'active', deadline: { lt: now } },
      data: { status: 'archived' },
    });

    const jobs = await this.prisma.job.findMany({
      where: { status: 'active', visibility: 'public' },
      include: {
        client: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { proposals: true } },
        criteria: { orderBy: { position: 'asc' } },
        category: true,
      },
      orderBy: { publishedAt: 'desc' },
    });
    return jobs.map((j) => ({
      ...this.mapJob(j),
      proposalsCount: j._count.proposals,
    }));
  }

  // ─── List My Jobs (for clients) ─────────────────────────

  async listMyJobs(clientId: string) {
    const jobs = await this.prisma.job.findMany({
      where: { clientId },
      include: {
        client: { select: { id: true, displayName: true, avatarUrl: true } },
        _count: { select: { proposals: true } },
        criteria: { orderBy: { position: 'asc' } },
        milestones: { orderBy: { position: 'asc' } },
        category: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return jobs.map((j) => ({
      ...this.mapJob(j),
      proposalsCount: j._count.proposals,
    }));
  }

  // ─── Get Single Job ─────────────────────────────────────

  async getJob(jobId: string, viewerId?: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        client: { select: { id: true, displayName: true, avatarUrl: true } },
        freelancer: { select: { id: true, displayName: true, avatarUrl: true } },
        criteria: { orderBy: { position: 'asc' } },
        milestones: { orderBy: { position: 'asc' } },
        category: true,
        attachments: { orderBy: { createdAt: 'desc' } },
        changes: { orderBy: { createdAt: 'desc' }, take: 50 },
        _count: { select: { proposals: true } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    // Record view (only if viewer is not the job owner)
    if (viewerId && viewerId !== job.clientId) {
      await this.prisma.jobView.create({ data: { jobId, viewerId } }).catch(() => {});
    }

    return {
      ...this.mapJob(job),
      proposalsCount: job._count.proposals,
      changes: job.changes?.map((c: any) => ({
        id: c.id,
        field: c.field,
        oldValue: c.oldValue,
        newValue: c.newValue,
        changedBy: c.changedBy,
        createdAt: c.createdAt.toISOString(),
      })),
    };
  }

  // ─── Update Job ─────────────────────────────────────────

  async updateJob(userId: string, jobId: string, dto: UpdateJobDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    const { acceptanceCriteria, milestones, ...fields } = dto;
    const changes: { field: string; oldValue: string | null; newValue: string | null }[] = [];

    const data: any = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && (job as any)[key] !== value) {
        changes.push({
          field: key,
          oldValue: String((job as any)[key] ?? ''),
          newValue: String(value),
        });
        if (key === 'deadline') {
          data[key] = value ? new Date(value as string) : null;
        } else {
          data[key] = value;
        }
      }
    }

    if (dto.budgetHoursMin !== undefined) data.budgetHoursMin = dto.budgetHoursMin;
    if (dto.budgetHoursMax !== undefined) data.budgetHoursMax = dto.budgetHoursMax;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;
    if (dto.applicationLimit !== undefined) data.applicationLimit = dto.applicationLimit;

    if (acceptanceCriteria) {
      changes.push({ field: 'acceptanceCriteria', oldValue: null, newValue: `${acceptanceCriteria.length} items` });
      data.criteria = {
        deleteMany: {},
        create: acceptanceCriteria.map((c, i) => ({
          description: c.description,
          position: c.position ?? i,
        })),
      };
    }

    if (milestones) {
      changes.push({ field: 'milestones', oldValue: null, newValue: `${milestones.length} items` });
      data.milestones = {
        deleteMany: {},
        create: milestones.map((m, i) => ({
          title: m.title,
          description: m.description,
          amount: m.amount,
          dueDate: m.dueDate ? new Date(m.dueDate) : null,
          position: m.position ?? i,
        })),
      };
    }

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data,
      include: {
        client: { select: { id: true, displayName: true, avatarUrl: true } },
        criteria: { orderBy: { position: 'asc' } },
        milestones: { orderBy: { position: 'asc' } },
        category: true,
      },
    });

    // Record changes
    if (changes.length) {
      await this.prisma.jobChange.createMany({
        data: changes.map((c) => ({
          jobId,
          field: c.field,
          oldValue: c.oldValue,
          newValue: c.newValue,
          changedBy: userId,
        })),
      });
    }

    return this.mapJob(updated);
  }

  // ─── Duplicate Job ───────────────────────────────────────

  async duplicateJob(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      include: { criteria: true, milestones: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    const data: any = {
      clientId: userId,
      title: `${job.title} (copy)`,
      description: job.description,
      budgetType: job.budgetType,
      budgetAmount: job.budgetAmount,
      budgetAsset: job.budgetAsset,
      budgetHoursMin: job.budgetHoursMin,
      budgetHoursMax: job.budgetHoursMax,
      status: 'draft',
      deadline: job.deadline,
      tags: job.tags,
      visibility: job.visibility,
      applicationLimit: job.applicationLimit,
      categoryId: job.categoryId,
    };

    if (job.criteria?.length) {
      data.criteria = {
        create: job.criteria.map((c: any) => ({
          description: c.description,
          position: c.position,
        })),
      };
    }

    if (job.milestones?.length) {
      data.milestones = {
        create: job.milestones.map((m: any) => ({
          title: m.title,
          description: m.description,
          amount: m.amount,
          dueDate: m.dueDate,
          position: m.position,
        })),
      };
    }

    const dup = await this.prisma.job.create({
      data,
      include: {
        client: { select: { id: true, displayName: true, avatarUrl: true } },
        criteria: { orderBy: { position: 'asc' } },
        milestones: { orderBy: { position: 'asc' } },
      },
    });
    return this.mapJob(dup);
  }

  // ─── Delete / Cancel Job ────────────────────────────────

  async deleteJob(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    switch (job.status) {
      case 'draft':
      case 'archived':
      case 'cancelled':
        await this.prisma.job.delete({ where: { id: jobId } });
        return;

      case 'active':
      case 'review':
      case 'in_progress':
        await this.prisma.job.update({
          where: { id: jobId },
          data: { status: 'cancelled' },
        });
        return;

      case 'completed':
        await this.prisma.job.update({
          where: { id: jobId },
          data: { status: 'archived' },
        });
        return;

      default:
        throw new BadRequestException('Cannot delete job in this state');
    }
  }

  // ─── Pause / Resume Job (toggle visibility) ─────────────

  async pauseJob(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    const pausable = ['active', 'review', 'in_progress'];
    if (!pausable.includes(job.status)) {
      throw new BadRequestException('Only active jobs can be paused');
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: { visibility: 'hidden' },
    });
  }

  async resumeJob(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    if (job.visibility !== 'hidden') {
      throw new BadRequestException('Job is not paused');
    }

    await this.prisma.job.update({
      where: { id: jobId },
      data: { visibility: 'public' },
    });
  }

  // ─── Expiry Reminder (runs every 30 min) ────────────────

  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendExpiryReminders() {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const expiringJobs = await this.prisma.job.findMany({
      where: {
        status: 'active',
        expiresAt: { not: null, gte: in24h, lte: in48h },
        expiryReminderSent: false,
      },
      include: {
        client: { select: { id: true, email: true, displayName: true } },
      },
    });

    for (const job of expiringJobs) {
      try {
        await this.emailService.sendExpiryReminderEmail(
          job.client.email,
          job.title,
          job.expiresAt!,
        );
        await this.prisma.job.update({
          where: { id: job.id },
          data: { expiryReminderSent: true },
        });
        this.logger.log(`Expiry reminder sent for job ${job.id} to ${job.client.email}`);
      } catch (err) {
        this.logger.error(`Failed to send expiry reminder for job ${job.id}: ${(err as Error).message}`);
      }
    }
  }

  // ─── Analytics ───────────────────────────────────────────

  async getJobAnalytics(userId: string, jobId: string) {
    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, clientId: true, title: true },
    });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    const [views, proposals] = await Promise.all([
      this.prisma.jobView.count({ where: { jobId } }),
      this.prisma.proposal.findMany({
        where: { jobId },
        select: { status: true },
      }),
    ]);

    const total = proposals.length;
    const shortlisted = proposals.filter((p) => p.status === 'shortlisted' || p.status === 'accepted').length;
    const accepted = proposals.filter((p) => p.status === 'accepted').length;

    return {
      jobId,
      title: job.title,
      views,
      applications: total,
      shortlisted,
      accepted,
      shortlistRate: total > 0 ? Math.round((shortlisted / total) * 100) : 0,
      conversionRate: shortlisted > 0 ? Math.round((accepted / shortlisted) * 100) : 0,
    };
  }

  // ─── Job Categories ──────────────────────────────────────

  async getCategories(parentId?: string) {
    const where: any = {};
    if (parentId) where.parentId = parentId;
    return this.prisma.jobCategory.findMany({
      where,
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { children: true, jobs: true } } },
    });
  }

  async getCategoryTree() {
    const cats = await this.prisma.jobCategory.findMany({
      orderBy: [{ level: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    const build = (parentId: string | null): any[] =>
      cats.filter((c) => c.parentId === parentId).map((c) => ({
        ...c,
        children: build(c.id),
      }));
    return build(null);
  }

  // ─── Submit Proposal ────────────────────────────────────

  async submitProposal(freelancerId: string, jobId: string, dto: CreateProposalDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== 'active') throw new BadRequestException('Job is not accepting proposals');
    if (job.clientId === freelancerId) throw new BadRequestException('Cannot apply to your own job');

    // Check application limit
    if (job.applicationLimit) {
      const count = await this.prisma.proposal.count({ where: { jobId } });
      if (count >= job.applicationLimit) {
        throw new BadRequestException('This job has reached its application limit');
      }
    }

    const existing = await this.prisma.proposal.findUnique({
      where: { jobId_freelancerId: { jobId, freelancerId } },
    });
    if (existing) throw new ConflictException('Already applied to this job');

    const proposal = await this.prisma.proposal.create({
      data: {
        jobId,
        freelancerId,
        body: dto.body,
        bidAmount: dto.bidAmount,
        bidAsset: dto.bidAsset,
      },
      include: {
        freelancer: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return this.mapProposal(proposal);
  }

  // ─── List Proposals for a Job (for job owner) ──────────

  async listProposals(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    const proposals = await this.prisma.proposal.findMany({
      where: { jobId },
      include: {
        freelancer: { select: { id: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    return proposals.map((p) => this.mapProposal(p));
  }

  // ─── List My Proposals (for freelancer) ────────────────

  async listMyProposals(freelancerId: string) {
    const proposals = await this.prisma.proposal.findMany({
      where: { freelancerId },
      include: {
        freelancer: { select: { id: true, displayName: true, avatarUrl: true } },
        job: { select: { id: true, title: true, status: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
    return proposals.map((p) => ({
      ...this.mapProposal(p),
      job: p.job,
    }));
  }

  // ─── Update Proposal Status (for job owner) ────────────

  async updateProposalStatus(jobId: string, proposalId: string, userId: string, dto: UpdateProposalStatusDto) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    const proposal = await this.prisma.proposal.findFirst({
      where: { id: proposalId, jobId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');

    if (dto.status === 'accepted' && job.status !== 'active') {
      throw new BadRequestException('Job is not open for accepting proposals');
    }

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: dto.status },
      include: {
        freelancer: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });

    if (dto.status === 'accepted') {
      await this.prisma.job.update({
        where: { id: jobId },
        data: {
          status: 'in_progress',
          freelancerId: proposal.freelancerId,
        },
      });
    }

    return this.mapProposal(updated);
  }

  // ─── Withdraw Proposal (for freelancer) ─────────────────

  async withdrawProposal(freelancerId: string, proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (proposal.freelancerId !== freelancerId) throw new ForbiddenException('Not your proposal');
    if (proposal.status !== 'submitted') throw new BadRequestException('Can only withdraw submitted proposals');

    const updated = await this.prisma.proposal.update({
      where: { id: proposalId },
      data: { status: 'withdrawn' },
      include: {
        freelancer: { select: { id: true, displayName: true, avatarUrl: true } },
      },
    });
    return this.mapProposal(updated);
  }

  // ─── File Attachments ────────────────────────────────────

  private readonly ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv', 'application/zip'];
  private readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  async uploadAttachment(userId: string, jobId: string, file: Express.Multer.File) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    if (!this.ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
    }
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('File exceeds 20MB limit');
    }

    const uploadDir = join(process.cwd(), 'uploads', jobId);
    if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

    const fileName = `${randomUUID()}_${file.originalname}`;
    const storagePath = join(uploadDir, fileName);
    const { writeFileSync } = await import('fs');
    writeFileSync(storagePath, file.buffer);

    const attachment = await this.prisma.jobAttachment.create({
      data: {
        jobId,
        fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storagePath,
        uploadedBy: userId,
      },
    });
    return attachment;
  }

  async listAttachments(jobId: string, userId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    return this.prisma.jobAttachment.findMany({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteAttachment(userId: string, jobId: string, attachmentId: string) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.clientId !== userId) throw new ForbiddenException('Not your job');

    const attachment = await this.prisma.jobAttachment.findFirst({
      where: { id: attachmentId, jobId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    if (existsSync(attachment.storagePath)) unlinkSync(attachment.storagePath);
    await this.prisma.jobAttachment.delete({ where: { id: attachmentId } });
  }

  async downloadAttachment(attachmentId: string) {
    const attachment = await this.prisma.jobAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');
    if (!existsSync(attachment.storagePath)) throw new NotFoundException('File not found on disk');

    const file = createReadStream(attachment.storagePath);
    return new StreamableFile(file, {
      type: attachment.mimeType,
      disposition: `attachment; filename="${attachment.originalName}"`,
    });
  }

  // ─── Mappers ────────────────────────────────────────────

  private mapJob(job: any) {
    return {
      id: job.id,
      title: job.title,
      description: job.description,
      budgetType: job.budgetType,
      budgetAmount: Number(job.budgetAmount),
      budgetAsset: job.budgetAsset,
      budgetHoursMin: job.budgetHoursMin ? Number(job.budgetHoursMin) : null,
      budgetHoursMax: job.budgetHoursMax ? Number(job.budgetHoursMax) : null,
      status: job.status,
      visibility: job.visibility ?? 'public',
      applicationLimit: job.applicationLimit ?? null,
      deadline: job.deadline?.toISOString() ?? null,
      expiresAt: job.expiresAt?.toISOString() ?? null,
      tags: job.tags ?? [],
      expiryReminderSent: job.expiryReminderSent ?? false,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      publishedAt: job.publishedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      client: job.client ?? null,
      freelancer: job.freelancer ?? null,
      categoryId: job.categoryId ?? null,
      category: job.category ?? null,
      criteria: job.criteria?.map((c: any) => ({
        id: c.id,
        description: c.description,
        done: c.done,
        position: c.position,
      })) ?? [],
      milestones: job.milestones?.map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        amount: Number(m.amount),
        dueDate: m.dueDate?.toISOString() ?? null,
        position: m.position,
        status: m.status,
      })) ?? [],
      attachments: job.attachments?.map((a: any) => ({
        id: a.id,
        fileName: a.fileName,
        originalName: a.originalName,
        mimeType: a.mimeType,
        size: Number(a.size),
        createdAt: a.createdAt.toISOString(),
      })) ?? [],
    };
  }

  private mapProposal(proposal: any) {
    return {
      id: proposal.id,
      body: proposal.body,
      bidAmount: Number(proposal.bidAmount),
      bidAsset: proposal.bidAsset,
      status: proposal.status,
      submittedAt: proposal.submittedAt.toISOString(),
      updatedAt: proposal.updatedAt.toISOString(),
      freelancer: proposal.freelancer ?? null,
    };
  }
}
