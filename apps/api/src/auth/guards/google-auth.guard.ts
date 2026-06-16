import { Injectable, ExecutionContext, HttpStatus, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ENV } from '../../config/env';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    return { state: req.query.state || req.query.mode || 'login' };
  }

  handleRequest<TUser = any>(err: any, user: any, _info: any, context: ExecutionContext): TUser {
    const res = context.switchToHttp().getResponse();

    if (err || !user) {
      if (!res.headersSent) {
        const url = new URL('/auth/callback', ENV.WEBAPP_URL);
        const message = err instanceof Error ? err.message : 'Google authentication failed';
        url.searchParams.set('error', message);
        res.redirect(HttpStatus.FOUND, url.toString());
      }
      throw new BadRequestException('redirected');
    }

    return user;
  }
}
