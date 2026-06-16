import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasskeyService } from './passkey.service';
import { ChallengeStore } from './challenge-store';
import { JwtStrategy } from './jwt.strategy';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';
import { JwtAuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoginRateLimitService } from './login-rate-limit.service';
import { CookieService } from './cookie.service';
import { GoogleOAuthStrategy } from './strategies/google-oauth.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { LinkTokenStore } from './link-token-store';
import { RestoreOtpStore } from './restore-otp-store';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { TwoFactorService } from '../twofactor/twofactor.service';
import { TwoFactorOtpStore } from '../twofactor/two-factor-otp-store';
import { PasswordResetService } from '../password-reset/password-reset.service';
import { RecoveryCodesService } from '../recovery/recovery-codes.service';
import { ENV } from '../config/env';

@Module({
  imports: [
    JwtModule.register({ secret: ENV.JWT_SECRET }),
    PassportModule,
    PrismaModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasskeyService,
    ChallengeStore,
    JwtStrategy,
    JwtRefreshStrategy,
    JwtAuthGuard,
    RolesGuard,
    LoginRateLimitService,
    CookieService,
    GoogleOAuthStrategy,
    TwoFactorService,
    TwoFactorOtpStore,
    PasswordResetService,
    RecoveryCodesService,
    GoogleAuthGuard,
    LinkTokenStore,
    RestoreOtpStore,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, CookieService],
})
export class AuthModule {}
