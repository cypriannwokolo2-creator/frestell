import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { ENV } from '../config/env';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LoginRateLimitService {
  private readonly logger = new Logger(LoginRateLimitService.name);
  private readonly ipAttempts = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  async recordAttempt(params: {
    userId?: string; email?: string; ip: string; userAgent?: string; success: boolean; reason?: string;
  }): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: {
        userId: params.userId,
        email: params.email,
        ip: params.ip,
        userAgent: params.userAgent,
        success: params.success,
        reason: params.reason,
      },
    });

    if (!params.success && params.email) {
      this.recordIpAttempt(params.ip);
      await this.checkLockout(params.email, params.ip);
    }
  }

  async isLocked(email: string, ip: string): Promise<{ locked: boolean; remainingMinutes?: number }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user?.lockedUntil && user.lockedUntil > new Date()) {
      const remaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return { locked: true, remainingMinutes: remaining };
    }

    const ipRecent = this.getIpAttempts(ip);
    if (ipRecent >= ENV.LOGIN_LOCKOUT_THRESHOLD) {
      return { locked: true, remainingMinutes: 15 };
    }

    return { locked: false };
  }

  async clearLockout(email: string): Promise<void> {
    await this.prisma.user.updateMany({
      where: { email, lockedUntil: { not: null } },
      data: { lockedUntil: null, failedAttempts: 0 },
    });
  }

  private async checkLockout(email: string, ip: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user) {
      const newCount = user.failedAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: newCount },
      });

      if (newCount >= ENV.LOGIN_LOCKOUT_THRESHOLD) {
        const lockDuration = ENV.LOGIN_LOCKOUT_DURATION * 1000;
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lockedUntil: new Date(Date.now() + lockDuration), failedAttempts: 0 },
        });

        await this.auditService.log({
          userId: user.id, action: 'account.locked', entity: 'user', entityId: user.id, ip,
        });
        await this.emailService.sendLockoutNotification(email, ENV.LOGIN_LOCKOUT_DURATION / 60);
        this.logger.warn(`Account locked: ${email}`);
      }
    }

    const ipRecent = this.getIpAttempts(ip);
    if (ipRecent >= ENV.LOGIN_LOCKOUT_THRESHOLD) {
      this.logger.warn(`IP rate-limited: ${ip}`);
    }
  }

  private recordIpAttempt(ip: string): void {
    const now = Date.now();
    const attempts = this.ipAttempts.get(ip) || [];
    attempts.push(now);
    this.ipAttempts.set(ip, attempts.filter((t) => now - t < ENV.LOGIN_LOCKOUT_DURATION * 1000));
  }

  private getIpAttempts(ip: string): number {
    const now = Date.now();
    const attempts = this.ipAttempts.get(ip) || [];
    const recent = attempts.filter((t) => now - t < ENV.LOGIN_LOCKOUT_DURATION * 1000);
    this.ipAttempts.set(ip, recent);
    return recent.length;
  }
}
