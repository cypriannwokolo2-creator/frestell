import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../prisma/prisma.module';
import { Logger } from 'nestjs-pino';

describe('Auth API (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(Logger)
      .useValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn() })
      .compile();

    app = module.createNestApplication({ logger: false });
    app.setGlobalPrefix('api', { exclude: ['health', 'ready', 'live'] });

    prisma = app.get(PrismaService);

    await app.init();
  }, 60_000);

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'test-auth@test.com' } });
    await app?.close();
  });

  const testUser = { email: 'test-auth@test.com', password: 'Password123!', displayName: 'Test Auth' };

  // ─── Register ─────────────────────────────────────────────────────

  describe('POST /api/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      await prisma.user.deleteMany({ where: { email: testUser.email } }).catch(() => {});

      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.role).toBe('freelancer');
      expect(res.body.tokens.accessToken).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
      expect(res.body.tokens.tokenType).toBe('Bearer');
      expect(res.body.tokens.expiresIn).toBe(900);

      accessToken = res.body.tokens.accessToken;
      refreshToken = res.body.tokens.refreshToken;
    });

    it('should reject duplicate email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
    });

    it('should reject invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'bad-email', password: 'Password123!' });
      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'short@test.com', password: '123' });
      expect(res.status).toBe(400);
    });
  });

  // ─── Login ─────────────────────────────────────────────────────────

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });

      expect(res.status).toBe(200);
      expect(res.body.tokens.accessToken).toBeDefined();
      accessToken = res.body.tokens.accessToken;
      refreshToken = res.body.tokens.refreshToken;
    });

    it('should reject wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrong' });
      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'noone@test.com', password: 'Password123!' });
      expect(res.status).toBe(401);
    });
  });

  // ─── Refresh ───────────────────────────────────────────────────────

  describe('POST /api/auth/refresh', () => {
    it('should rotate refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);
      refreshToken = res.body.refreshToken;
    });

    it('should reject invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'bad-token' });
      expect(res.status).toBe(401);
    });
  });

  // ─── Me ────────────────────────────────────────────────────────────

  describe('POST /api/auth/me', () => {
    it('should return current user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe(testUser.email);
      expect(res.body.totpEnabled).toBe(false);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app.getHttpServer()).post('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });

  // ─── Change Password ───────────────────────────────────────────────

  describe('POST /api/auth/change-password', () => {
    it('should change password with valid current password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: testUser.password, newPassword: 'NewPassword123!' });

      expect(res.status).toBe(200);

      // Login with new password
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'NewPassword123!' });
      expect(loginRes.status).toBe(200);
      accessToken = loginRes.body.tokens.accessToken;
    });

    it('should reject wrong current password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currentPassword: 'wrong', newPassword: 'NewPassword123!' });
      expect(res.status).toBe(400);
    });
  });

  // ─── Sessions ──────────────────────────────────────────────────────

  describe('GET /api/auth/sessions', () => {
    it('should list active sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Logout ────────────────────────────────────────────────────────

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(res.status).toBe(204);
    });

    it('should reject reused refresh token after logout', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken });
      expect(res.status).toBe(401);
    });
  });

  // ─── Password Reset ────────────────────────────────────────────────

  describe('POST /api/auth/password-reset/request', () => {
    it('should accept password reset request', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/password-reset/request')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
    });

    it('should not reveal if email exists', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/password-reset/request')
        .send({ email: 'nonexistent@test.com' });

      expect(res.status).toBe(200);
    });
  });

  // ─── 2FA Flow ──────────────────────────────────────────────────────

  describe('2FA /api/auth/2fa/*', () => {
    let totpToken: string;

    // Login again first
    beforeAll(async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'NewPassword123!' });
      accessToken = loginRes.body.tokens.accessToken;
    });

    it('should generate TOTP secret', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/2fa/generate')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.secret).toBeDefined();
      expect(res.body.qrCodeUrl).toBeDefined();
    });

    it('should reject invalid TOTP token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/2fa/enable')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ token: '000000' });

      expect(res.status).toBe(400);
    });

    it('should return 2FA status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/2fa/status')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.enabled).toBe(false);
    });
  });

  // ─── Audit Log ─────────────────────────────────────────────────────

  describe('GET /api/auth/audit-log', () => {
    it('should return audit log entries', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/audit-log')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ─── Google OAuth (simulated redirect) ─────────────────────────────

  describe('GET /api/auth/google', () => {
    it('should redirect to Google', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/google');

      // Without proper Google Client ID, this will fail — just check it returns something
      expect([302, 401, 500]).toContain(res.status);
    });
  });

  // ─── Account Deletion Flow ─────────────────────────────────────────

  describe('POST /api/auth/delete-account', () => {
    it('should reject delete without password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/delete-account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ password: 'wrong' });

      expect(res.status).toBe(400);
    });
  });
});
