import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ENV, THROTTLE_WHITE_LIST } from '../config/env';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: seconds(ENV.THROTTLE_TTL_SECONDS),
        limit: ENV.THROTTLE_LIMIT,
        skipIf: (ctx) => {
          const req = ctx.switchToHttp().getRequest();
          const ip = req?.ips?.[0] ?? req?.ip;
          return THROTTLE_WHITE_LIST.includes(ip);
        },
      },
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  exports: [ThrottlerModule],
})
export class AppThrottlerModule {}
