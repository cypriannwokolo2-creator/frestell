import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { ENV } from '../../config/env';

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const cookieName = ENV.CSRF_COOKIE_NAME;

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      if (!req.cookies?.[cookieName]) {
        const token = randomBytes(32).toString('hex');
        res.cookie(cookieName, token, {
          httpOnly: false,
          secure: ENV.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
        });
      }
      return next();
    }

    const headerToken = req.headers['x-csrf-token'] as string;
    const cookieToken = req.cookies?.[cookieName];

    if (!headerToken || !cookieToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (headerToken !== cookieToken) {
      throw new ForbiddenException('CSRF token mismatch');
    }

    next();
  }
}
