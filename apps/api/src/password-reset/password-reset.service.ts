import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomUUID, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { ENV } from '../config/env';
import { EmailService } from '../email/email.service';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly requestWindow = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async requestReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('No account found with that email');
    if (!user.passwordHash) throw new BadRequestException('This account uses passkey or Google login. Set a password first.');

    this.rateLimit(email);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + this.parseExpiryMs(ENV.PASSWORD_RESET_EXPIRES_IN));

    await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.emailService.sendPasswordResetEmail(email, otp);
    this.logger.log(`Password reset OTP sent to ${email}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const record = await this.prisma.passwordReset.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) throw new Error('Invalid or expired reset token');

    const argon2 = require('argon2');
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await this.prisma.$transaction([
      this.prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.session.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);

    this.logger.log(`Password reset completed for user ${record.userId}`);
  }

  private rateLimit(email: string): void {
    const now = Date.now();
    const window = ENV.PASSWORD_RESET_RATE_WINDOW * 1000;
    const max = ENV.PASSWORD_RESET_RATE_LIMIT;

    const timestamps = this.requestWindow.get(email) || [];
    const recent = timestamps.filter((t) => now - t < window);
    if (recent.length >= max) {
      throw new Error('Too many password reset requests. Try again later.');
    }
    recent.push(now);
    this.requestWindow.set(email, recent);
  }

  private parseExpiryMs(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 15 * 60 * 1000;
    const n = Number(match[1]);
    switch (match[2]) {
      case 's': return n * 1000;
      case 'm': return n * 60 * 1000;
      case 'h': return n * 60 * 60 * 1000;
      case 'd': return n * 24 * 60 * 60 * 1000;
      default: return 15 * 60 * 1000;
    }
  }
}
