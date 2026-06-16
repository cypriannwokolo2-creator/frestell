import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { AuditModule } from './audit/audit.module';
import { TwoFactorModule } from './twofactor/twofactor.module';
import { PasswordResetModule } from './password-reset/password-reset.module';
import { RecoveryModule } from './recovery/recovery.module';
import { ProfileModule } from './profile/profile.module';
import { JobsModule } from './jobs/jobs.module';
import { CsrfMiddleware } from './auth/middleware/csrf.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { loggerConfig } from './common/logging/logger.config';
import { ENV } from './config/env';

@Module({
  imports: [
    LoggerModule.forRoot(loggerConfig()),
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: ENV.THROTTLE_TTL_SECONDS * 1000, limit: ENV.THROTTLE_LIMIT }],
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    EmailModule,
    AuditModule,
    TwoFactorModule,
    PasswordResetModule,
    RecoveryModule,
    ProfileModule,
    JobsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CsrfMiddleware)
      .exclude(
        'health/(.*)',
        'live/(.*)',
        'ready/(.*)',
        'auth/login',
        'auth/register',
        'auth/verify-email',
        'auth/resend-verification',
        'auth/refresh',
        'auth/google/(.*)',
        'auth/passkey/login/(.*)',
        'auth/passkey/signup/(.*)',
        'auth/password-reset/(.*)',
        'auth/recovery-codes/use',
        'auth/restore-account',
        'auth/restore-account/send-otp',
        'auth/restore-account/confirm',
        'auth/me',
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
