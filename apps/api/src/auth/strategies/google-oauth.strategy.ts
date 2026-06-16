import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Request } from 'express';
import { ENV } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.module';
import { LinkTokenStore } from '../link-token-store';

@Injectable()
export class GoogleOAuthStrategy extends PassportStrategy(GoogleStrategy, 'google') {
  private readonly logger = new Logger(GoogleOAuthStrategy.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly linkTokenStore: LinkTokenStore,
  ) {
    super({
      clientID: ENV.GOOGLE_CLIENT_ID || 'missing',
      clientSecret: ENV.GOOGLE_CLIENT_SECRET || 'missing',
      callbackURL: ENV.GOOGLE_CALLBACK_URL || `${ENV.BASE_URL}/${ENV.API_PREFIX}/auth/google/callback`,
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(req: Request, _accessToken: string, _refreshToken: string, profile: any): Promise<any> {
    const { id, emails, displayName } = profile;
    const email = emails?.[0]?.value;
    const state = req.query.state as string;

    if (!email) {
      throw new BadRequestException('Google account has no email');
    }

    // --- Connect flow (linkToken contains userId) ---
    if (state) {
      const userId = this.linkTokenStore.consume(state);
      if (userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new BadRequestException('User not found');

        if (user.email !== email) {
          throw new BadRequestException(
            `The Google account email (${email}) does not match your account email (${user.email}). Use the same email address.`,
          );
        }

        const existingByGoogleId = await this.prisma.user.findUnique({ where: { googleId: id } });
        if (existingByGoogleId && existingByGoogleId.id !== userId) {
          throw new BadRequestException('This Google account is already linked to another profile');
        }

        const updated = await this.prisma.user.update({
          where: { id: userId }, data: { googleId: id },
        });
        return updated;
      }
    }

    // --- Normal flow: find by googleId ---
    const existingByGoogleId = await this.prisma.user.findUnique({ where: { googleId: id } });
    if (existingByGoogleId) {
      return existingByGoogleId;
    }

    // --- Check by email ---
    const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingByEmail) {
      if (existingByEmail.passwordHash) {
        throw new BadRequestException('This email is registered with a password. Sign in with your email and password, or connect Google from Settings.');
      }
      const user = await this.prisma.user.update({
        where: { id: existingByEmail.id }, data: { googleId: id },
      });
      return user;
    }

    // --- New user ---
    const user = await this.prisma.user.create({
      data: {
        email,
        displayName: displayName || email.split('@')[0],
        googleId: id,
        emailVerifiedAt: new Date(),
      },
    });
    return user;
  }
}
