import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.module';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { TwoFactorOtpStore } from './two-factor-otp-store';
import { emailTemplate } from '../email/email-template';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly otpStore: TwoFactorOtpStore,
  ) {}

  async generateSecret(userId: string, email: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const speakeasy = require('speakeasy');
    const secret = speakeasy.generateSecret({ name: `FreStell (${email})` });

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: secret.base32 },
    });

    const qrcode = require('qrcode');
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

    return { secret: secret.base32, qrCodeUrl };
  }

  async enable(userId: string, token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('Generate a secret first');

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) throw new BadRequestException('Invalid TOTP token');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpEnabled: true, totpVerifiedAt: new Date() },
    });

    await this.auditService.log({ userId, action: '2fa.enable', entity: 'user', entityId: userId });
    await this.emailService.send2FAEnabledEmail(user.email);
    this.logger.log(`2FA enabled for user ${userId}`);
  }

  async disable(userId: string, token: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('2FA is not configured');

    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
    });

    if (!verified) throw new BadRequestException('Invalid TOTP token');

    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null, totpEnabled: false, totpVerifiedAt: null },
    });

    await this.auditService.log({ userId, action: '2fa.disable', entity: 'user', entityId: userId });
    await this.emailService.send2FADisabledEmail(user.email);
    this.logger.log(`2FA disabled for user ${userId}`);
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret || !user.totpEnabled) return true;

    const speakeasy = require('speakeasy');
    return speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async sendEmailOtp(userId: string, email: string): Promise<void> {
    const otp = this.otpStore.create(userId);
    await this.emailService.send(email, {
      subject: 'Your 2FA backup code — FreStell',
      html: emailTemplate({
        title: 'Two-factor authentication code',
        body: 'Use the 6-digit code below to sign in to your account. This is an alternative to your authenticator app.',
        otp,
        warning: 'This code expires in 10 minutes. If you didn\'t request this, ignore this email.',
      }),
    });
  }

  async verifyEmailOtp(userId: string, code: string): Promise<boolean> {
    return this.otpStore.verify(userId, code);
  }

  async getStatus(userId: string): Promise<{ enabled: boolean; verifiedAt: Date | null }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { totpEnabled: true, totpVerifiedAt: true } });
    return { enabled: user?.totpEnabled ?? false, verifiedAt: user?.totpVerifiedAt ?? null };
  }
}
