import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { ENV } from '../config/env';
import { EmailService } from '../email/email.service';
import { emailTemplate } from '../email/email-template';
import { AuditService } from '../audit/audit.service';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { RecoveryCodesService } from '../recovery/recovery-codes.service';
import { LoginRateLimitService } from './login-rate-limit.service';
import { CookieService } from './cookie.service';
import { RestoreOtpStore } from './restore-otp-store';
import type { RegisterDto, LoginDto, TokenPair, AuthUserResponse } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
    private readonly twoFactorService: TwoFactorService,
    private readonly recoveryCodesService: RecoveryCodesService,
    private readonly loginRateLimitService: LoginRateLimitService,
    public readonly cookieService: CookieService,
    private readonly restoreOtpStore: RestoreOtpStore,
  ) {}

  async register(dto: RegisterDto): Promise<{ message: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      if (existing.deletedAt) throw new BadRequestException('This account was deleted. Contact support to restore it.');
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const verificationOtp = String(Math.floor(100000 + Math.random() * 900000));
    const tokenHash = this.hashToken(verificationOtp);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        displayName: dto.displayName ?? null,
        passwordHash,
        role: dto.role,
        verificationTokenHash: tokenHash,
      },
    });

    await this.auditService.log({ userId: user.id, action: 'user.register', entity: 'user', entityId: user.id });
    await this.emailService.sendWelcomeEmail(dto.email);
    await this.emailService.sendVerificationEmailOtp(dto.email, verificationOtp);
    this.logger.log(`Verification OTP sent to ${dto.email}`);

    setTimeout(async () => {
      try {
        const u = await this.prisma.user.findUnique({ where: { id: user.id } });
        if (u && !u.emailVerifiedAt) {
          await this.prisma.user.delete({ where: { id: user.id } });
          this.logger.log(`Unverified account deleted for ${u.email}`);
        }
      } catch (e) {
        this.logger.error(`Failed to cleanup unverified account ${user.id}: ${e}`);
      }
    }, 15 * 60 * 1000);

    return { message: 'Verification code sent to your email' };
  }

  async verifyEmail(otp: string): Promise<{ user: AuthUserResponse; tokens: TokenPair }> {
    const otpHash = this.hashToken(otp);
    const user = await this.prisma.user.findFirst({
      where: { verificationTokenHash: otpHash, emailVerifiedAt: null },
    });
    if (!user) throw new BadRequestException('Invalid or expired verification code');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifiedAt: new Date(), verificationTokenHash: null },
    });
    await this.auditService.log({ userId: user.id, action: 'email.verified', entity: 'user', entityId: user.id });
    this.logger.log(`Email verified for ${user.email}`);

    const tokens = await this.createTokenPair(user.id);
    return { user: this.mapUser(user), tokens };
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) throw new BadRequestException('Email already verified or not found');

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = this.hashToken(otp);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { verificationTokenHash: otpHash },
    });
    await this.emailService.sendVerificationEmailOtp(email, otp);
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<{ user: AuthUserResponse; tokens: TokenPair }> {
    const lockStatus = await this.loginRateLimitService.isLocked(dto.email, ip || 'unknown');
    if (lockStatus.locked) {
      await this.loginRateLimitService.recordAttempt({
        email: dto.email, ip: ip || 'unknown', userAgent, success: false, reason: 'account_locked',
      });
      throw new UnauthorizedException(`Account locked. Try again in ${lockStatus.remainingMinutes} minutes.`);
    }

    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      await this.loginRateLimitService.recordAttempt({
        email: dto.email, ip: ip || 'unknown', userAgent, success: false, reason: 'invalid_credentials',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.deletedAt) throw new BadRequestException('This account has been deleted.');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      await this.loginRateLimitService.recordAttempt({
        userId: user.id, email: dto.email, ip: ip || 'unknown', userAgent, success: false, reason: 'invalid_credentials',
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.totpEnabled) {
      if (dto.recoveryCode) {
        const valid = await this.recoveryCodesService.use(user.id, dto.recoveryCode);
        if (!valid) throw new UnauthorizedException('Invalid or already used recovery code');
      } else if (dto.twoFactorEmailOtp) {
        const valid = await this.twoFactorService.verifyEmailOtp(user.id, dto.twoFactorEmailOtp);
        if (!valid) throw new UnauthorizedException('Invalid or expired 2FA email code');
      } else if (dto.totpToken) {
        const totpValid = await this.twoFactorService.verify(user.id, dto.totpToken);
        if (!totpValid) throw new UnauthorizedException('Invalid TOTP token');
      } else {
        throw new UnauthorizedException('Two-factor authentication required. Provide TOTP token, email code, or recovery code.');
      }
    }

    await this.loginRateLimitService.recordAttempt({
      userId: user.id, email: dto.email, ip: ip || 'unknown', userAgent, success: true,
    });
    await this.loginRateLimitService.clearLockout(dto.email);

    await this.auditService.log({
      userId: user.id, action: 'user.login', entity: 'user', entityId: user.id, ip, metadata: { method: 'password' },
    });

    const tokens = await this.createTokenPair(user.id);
    return { user: this.mapUser(user), tokens };
  }

  async loginWithPasskey(
    userId: string, ip?: string, userAgent?: string,
  ): Promise<{ user: AuthUserResponse; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new UnauthorizedException('User not found');

    const tokens = await this.createTokenPair(user.id);
    await this.auditService.log({
      userId: user.id, action: 'user.login', entity: 'user', entityId: user.id, ip, metadata: { method: 'passkey' },
    });
    return { user: this.mapUser(user), tokens };
  }

  async refresh(rawToken: string): Promise<TokenPair> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.jwtService.verifyAsync(rawToken, { secret: ENV.JWT_REFRESH_SECRET });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.jti } });
    if (!session || session.revokedAt) {
      if (session?.revokedAt) {
        await this.revokeFamily(session.familyId);
        this.logger.warn(`Refresh token reuse — family ${session.familyId} revoked`);
      }
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    return this.createTokenPair(payload.sub, session.familyId);
  }

  async logout(rawToken: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync(rawToken, { secret: ENV.JWT_REFRESH_SECRET });
      await this.prisma.session.updateMany({
        where: { id: payload.jti, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.auditService.log({ userId: payload.sub, action: 'user.logout', entity: 'user', entityId: payload.sub });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async createTokenPair(userId: string, existingFamilyId?: string, deviceInfo?: string): Promise<TokenPair> {
    const familyId = existingFamilyId ?? randomUUID();
    const sessionId = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      { sub: userId },
      { expiresIn: ENV.JWT_EXPIRES_IN as any },
    );

    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, jti: sessionId },
      { secret: ENV.JWT_REFRESH_SECRET, expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any },
    );

    const expiresAt = new Date(Date.now() + this.parseExpiryMs(ENV.JWT_REFRESH_EXPIRES_IN));
    await this.prisma.session.create({
      data: {
        id: sessionId, userId, familyId, tokenHash: this.hashToken(refreshToken),
        expiresAt, deviceInfo,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpirySec(ENV.JWT_EXPIRES_IN),
      tokenType: 'Bearer',
    } as TokenPair;
  }

  // ─── Session Management ──────────────────────────────────────────

  async listSessions(userId: string, currentSessionId?: string): Promise<any[]> {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((s: any) => ({
      id: s.id,
      deviceInfo: s.deviceInfo,
      ip: s.ip,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.session.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });
    if (!session) throw new BadRequestException('Session not found');
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await this.auditService.log({
      userId, action: 'session.revoke', entity: 'session', entityId: sessionId,
    });
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const where: any = { userId, revokedAt: null };
    if (exceptSessionId) where.id = { not: exceptSessionId };
    await this.prisma.session.updateMany({ where, data: { revokedAt: new Date() } });
  }

  // ─── Account Deletion ────────────────────────────────────────────

  async deleteAccount(userId: string, password?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    if (user.passwordHash) {
      if (!password) throw new BadRequestException('Password is required to delete your account');
      const valid = await argon2.verify(user.passwordHash, password);
      if (!valid) throw new BadRequestException('Invalid password');
    }

    const restoreUntil = new Date(Date.now() + ENV.ACCOUNT_DELETE_GRACE_DAYS * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), restoreUntil },
    });
    await this.revokeAllSessions(userId);
    await this.auditService.log({
      userId, action: 'account.delete', entity: 'user', entityId: userId,
    });
    await this.emailService.sendAccountDeletedEmail(user.email, ENV.ACCOUNT_DELETE_GRACE_DAYS);
  }

  async restoreAccount(email: string, password: string): Promise<{ user: AuthUserResponse; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.deletedAt) throw new BadRequestException('Account not found or not deleted');
    if (user.restoreUntil && user.restoreUntil < new Date()) {
      throw new BadRequestException('Restore window has expired. Account cannot be recovered.');
    }

    const valid = await argon2.verify(user.passwordHash!, password);
    if (!valid) throw new BadRequestException('Invalid password');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: null, restoreUntil: null },
    });

    const tokens = await this.createTokenPair(user.id);
    await this.auditService.log({ userId: user.id, action: 'account.restore', entity: 'user', entityId: user.id });
    return { user: this.mapUser(user), tokens };
  }

  async permanentlyDeleteExpired(): Promise<number> {
    const result = await this.prisma.user.deleteMany({
      where: { deletedAt: { not: null }, restoreUntil: { lt: new Date() } },
    });
    if (result.count > 0) {
      this.logger.log(`Permanently deleted ${result.count} expired accounts`);
    }
    return result.count;
  }

  // ─── Change Password ─────────────────────────────────────────────

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.passwordHash) throw new BadRequestException('Cannot change password for OAuth-only account');

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.revokeAllSessions(userId);
    await this.auditService.log({ userId, action: 'password.change', entity: 'user', entityId: userId });
    await this.emailService.sendPasswordChangedEmail(user.email);
  }

  // ─── Set Password (for OAuth/passkey-only users) ─────────────────

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.passwordHash) throw new BadRequestException('Password already set');

    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
    await this.auditService.log({ userId, action: 'password.set', entity: 'user', entityId: userId });
    if (user.email) await this.emailService.sendPasswordChangedEmail(user.email);
  }

  // ─── Email Change with OTP ──────────────────────────────────────

  async requestEmailChange(userId: string, newEmail: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (user.email === newEmail) throw new BadRequestException('New email is the same as current');

    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) throw new BadRequestException('Email already in use');

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailChangeOtp: otp,
        emailChangeOtpExpires: expiresAt,
        emailChangeNewEmail: newEmail,
      },
    });

    await this.emailService.send(newEmail, {
      subject: 'Email change OTP — FreStell',
      html: emailTemplate({
        title: 'Email change request',
        body: 'Enter the 6-digit code below to confirm your email change.',
        otp,
        warning: 'This code expires in 10 minutes.',
      }),
    });
  }

  async confirmEmailChange(userId: string, otp: string, newEmail: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (!user.emailChangeOtp || !user.emailChangeOtpExpires || !user.emailChangeNewEmail) {
      throw new BadRequestException('No email change requested');
    }
    if (user.emailChangeOtp !== otp) throw new BadRequestException('Invalid OTP');
    if (user.emailChangeOtpExpires < new Date()) throw new BadRequestException('OTP expired');
    if (user.emailChangeNewEmail !== newEmail) throw new BadRequestException('Email mismatch');

    const existing = await this.prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) throw new BadRequestException('Email already in use');

    const oldEmail = user.email;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: newEmail,
        emailChangeOtp: null,
        emailChangeOtpExpires: null,
        emailChangeNewEmail: null,
      },
    });

    await Promise.all([
      this.emailService.send(oldEmail, {
        subject: 'Email address changed — FreStell',
        html: emailTemplate({
          title: 'Email address changed',
          body: `Your FreStell email has been changed to <strong>${newEmail}</strong>.`,
          warning: 'If you didn\'t request this, contact support immediately.',
        }),
      }),
      this.emailService.send(newEmail, {
        subject: 'Email address changed — FreStell',
        html: emailTemplate({
          title: 'Email address changed',
          body: `This email has been set as your new FreStell account email (previously <strong>${oldEmail}</strong>).`,
          warning: 'If you didn\'t request this, contact support immediately.',
        }),
      }),
    ]);
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  async getPasskeyCount(userId: string): Promise<number> {
    return this.prisma.passkey.count({ where: { userId } });
  }

  async validateCredentials(email: string, password: string): Promise<{ id: string; email: string; totpEnabled: boolean } | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return null;
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) return null;
    return { id: user.id, email: user.email, totpEnabled: user.totpEnabled };
  }

  async getUserById(id: string): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new UnauthorizedException('User not found');
    const passkeyCount = await this.getPasskeyCount(id);
    return {
      ...this.mapUser({ ...user, passwordHash: null }),
      hasPasskey: passkeyCount > 0,
    };
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiryMs(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const n = Number(match[1]);
    switch (match[2]) {
      case 's': return n * 1000;
      case 'm': return n * 60 * 1000;
      case 'h': return n * 60 * 60 * 1000;
      case 'd': return n * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private parseExpirySec(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)(s|m|h|d)$/);
    if (!match) return 7 * 24 * 60 * 60;
    const n = Number(match[1]);
    switch (match[2]) {
      case 's': return n;
      case 'm': return n * 60;
      case 'h': return n * 60 * 60;
      case 'd': return n * 24 * 60 * 60;
      default: return 7 * 24 * 60 * 60;
    }
  }

  mapUser(u: {
    id: string; email: string; displayName: string | null;
    role: string; tier: string; passwordHash: string | null;
    emailVerifiedAt?: Date | null; totpEnabled?: boolean;
    googleId?: string | null;
    deletedAt?: Date | null; restoreUntil?: Date | null;
    avatarUrl?: string | null;
    slug?: string | null;
  }): AuthUserResponse {
    return {
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      role: u.role as AuthUserResponse['role'],
      tier: u.tier as AuthUserResponse['tier'],
      hasPasskey: false,
      totpEnabled: u.totpEnabled ?? false,
      emailVerified: !!u.emailVerifiedAt,
      googleId: u.googleId ?? null,
      hasPassword: !!u.passwordHash,
      deletedAt: u.deletedAt?.toISOString() ?? null,
      restoreUntil: u.restoreUntil?.toISOString() ?? null,
      avatarUrl: u.avatarUrl ?? null,
      slug: u.slug ?? null,
    };
  }

  // ─── Restore Account ────────────────────────────────────────────

  async sendRestoreOtp(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.deletedAt) throw new BadRequestException('Account not found or not scheduled for deletion');
    if (user.restoreUntil && user.restoreUntil < new Date()) throw new BadRequestException('Restore window has expired');
    const otp = this.restoreOtpStore.create(email);
    await this.emailService.send(email, {
      subject: 'Restore your FreStell account',
      html: emailTemplate({
        title: 'Restore your account',
        body: 'Use the 6-digit code below to restore your account. This will cancel the deletion process.',
        otp,
        warning: 'This code expires in 10 minutes. If you didn\'t request this, ignore this email.',
      }),
    });
    this.logger.log(`Restore OTP sent to ${email}`);
  }

  async confirmRestoreOtp(email: string, otp: string): Promise<{ user: AuthUserResponse; tokens: TokenPair }> {
    const valid = this.restoreOtpStore.verify(email, otp);
    if (!valid) throw new BadRequestException('Invalid or expired OTP');

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.deletedAt) throw new BadRequestException('Account not found or not scheduled for deletion');
    if (user.restoreUntil && user.restoreUntil < new Date()) throw new BadRequestException('Restore window has expired');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: null, restoreUntil: null },
    });
    await this.auditService.log({
      userId: user.id, action: 'account.restore', entity: 'user', entityId: user.id,
    });

    const tokens = await this.createTokenPair(user.id);
    return { user: this.mapUser(user), tokens };
  }

  async disconnectGoogle(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.googleId) throw new BadRequestException('No Google account connected');
    await this.prisma.user.update({ where: { id: userId }, data: { googleId: null } });
    await this.auditService.log({ userId, action: 'google.disconnect', entity: 'user', entityId: userId });
  }
}
