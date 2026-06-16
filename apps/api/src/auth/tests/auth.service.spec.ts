import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.module';
import { EmailService } from '../../email/email.service';
import { AuditService } from '../../audit/audit.service';
import { TwoFactorService } from '../../twofactor/twofactor.service';
import { RecoveryCodesService } from '../../recovery/recovery-codes.service';
import { LoginRateLimitService } from '../login-rate-limit.service';
import { CookieService } from '../cookie.service';

jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('$argon2id$v=19$m=65536,t=3,p=4$mockedhash$mockedhashhashhashhashhash'),
  verify: jest.fn(),
  argon2id: 2,
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  displayName: 'Test',
  passwordHash: 'hash',
  role: 'freelancer',
  tier: 'email',
  googleId: null,
  emailVerifiedAt: null,
  totpEnabled: false,
  totpSecret: null,
  totpVerifiedAt: null,
  lockedUntil: null,
  failedAttempts: 0,
  deletedAt: null,
  restoreUntil: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createMock<T>(obj: T): T {
  return obj;
}

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwt: any;
  let emailService: any;
  let auditService: any;
  let twoFactorService: any;
  let recoveryCodesService: any;
  let loginRateLimitService: any;
  let cookieService: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn() },
      session: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      passkey: { count: jest.fn() },
      passwordReset: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
      loginAttempt: { create: jest.fn() },
      auditLog: { create: jest.fn(), findMany: jest.fn() },
      recoveryCode: { findFirst: jest.fn(), create: jest.fn(), createMany: jest.fn(), update: jest.fn(), deleteMany: jest.fn(), count: jest.fn() },
      twoFactor: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed-jwt'),
      verifyAsync: jest.fn(),
    };
    emailService = { sendWelcomeEmail: jest.fn(), sendVerificationEmailOtp: jest.fn(), sendPasswordResetEmail: jest.fn(), sendLockoutNotification: jest.fn(), sendPasswordChangedEmail: jest.fn(), sendAccountDeletedEmail: jest.fn(), send2FAEnabledEmail: jest.fn(), send2FADisabledEmail: jest.fn() };
    auditService = { log: jest.fn(), findByUser: jest.fn() };
    twoFactorService = { generateSecret: jest.fn(), enable: jest.fn(), disable: jest.fn(), verify: jest.fn().mockResolvedValue(true), getStatus: jest.fn() };
    recoveryCodesService = { generate: jest.fn(), use: jest.fn(), getRemainingCount: jest.fn() };
    loginRateLimitService = { isLocked: jest.fn().mockResolvedValue({ locked: false }), recordAttempt: jest.fn(), clearLockout: jest.fn() };
    cookieService = { setRefreshCookie: jest.fn(), clearRefreshCookie: jest.fn(), getRefreshToken: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: EmailService, useValue: emailService },
        { provide: AuditService, useValue: auditService },
        { provide: TwoFactorService, useValue: twoFactorService },
        { provide: RecoveryCodesService, useValue: recoveryCodesService },
        { provide: LoginRateLimitService, useValue: loginRateLimitService },
        { provide: CookieService, useValue: cookieService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('creates a user and returns token pair', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);
      prisma.session.create.mockResolvedValue({ id: 's1' });

      const result = await service.register({
        email: 'test@example.com', password: 'password123', role: 'freelancer',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.tokens.accessToken).toBe('signed-jwt');
      expect(emailService.sendVerificationEmailOtp).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    it('throws ConflictException when email exists', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    beforeEach(() => {
      (argon2.verify as jest.Mock).mockReset();
    });

    it('returns tokens on valid credentials', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.session.create.mockResolvedValue({ id: 's1' });

      const result = await service.login(
        { email: 'test@example.com', password: 'password123' },
        '127.0.0.1', 'test-agent',
      );

      expect(result.user.email).toBe('test@example.com');
      expect(loginRateLimitService.recordAttempt).toHaveBeenCalled();
      expect(loginRateLimitService.clearLockout).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
    });

    it('throws UnauthorizedException on wrong password', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'missing@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('requires TOTP when enabled', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, totpEnabled: true });
      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow('TOTP token required');
    });

    it('rejects locked accounts', async () => {
      loginRateLimitService.isLocked.mockResolvedValue({ locked: true, remainingMinutes: 15 });
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow('Account locked');
    });
  });

  describe('refresh', () => {
    it('rotates token successfully', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: mockUser.id, jti: 'session-1' });
      prisma.session.findUnique.mockResolvedValue({
        id: 'session-1', familyId: 'family-1', revokedAt: null,
      });
      prisma.session.update.mockResolvedValue({ id: 'session-1', revokedAt: new Date() });
      prisma.session.create.mockResolvedValue({ id: 'session-2' });

      const result = await service.refresh('valid-refresh-token');
      expect(result.accessToken).toBe('signed-jwt');
    });

    it('revokes family on reuse of revoked token', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: mockUser.id, jti: 'old-session' });
      prisma.session.findUnique.mockResolvedValue({
        id: 'old-session', familyId: 'family-1', revokedAt: new Date(),
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(UnauthorizedException);
      expect(prisma.session.updateMany).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('revokes the session', async () => {
      jwt.verifyAsync.mockResolvedValue({ sub: mockUser.id, jti: 'session-1' });
      await service.logout('valid-token');
      expect(prisma.session.updateMany).toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('changes password and revokes sessions', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.session.updateMany.mockResolvedValue({ count: 1 });

      await service.changePassword('user-1', 'old', 'new');
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'password.change' }),
      );
      expect(emailService.sendPasswordChangedEmail).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('returns user with flags', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.passkey.count.mockResolvedValue(1);
      const user = await service.getUserById(mockUser.id);
      expect(user.hasPasskey).toBe(true);
      expect(user.totpEnabled).toBe(false);
      expect(user.emailVerified).toBe(false);
    });
  });

  describe('delete/restore account', () => {
    it('soft-deletes account with restore window', async () => {
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      await service.deleteAccount('user-1', 'password123');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date), restoreUntil: expect.any(Date) }),
        }),
      );
    });
  });
});
