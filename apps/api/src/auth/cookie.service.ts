import { Injectable } from '@nestjs/common';
import { Response, Request } from 'express';
import { ENV } from '../config/env';

@Injectable()
export class CookieService {
  private readonly cookieName = ENV.JWT_COOKIE_NAME;
  private readonly secure = ENV.NODE_ENV === 'production';
  private readonly sameSite: 'strict' | 'lax' = 'strict';

  setRefreshCookie(res: Response, token: string): void {
    const maxAge = this.parseMaxAge(ENV.JWT_REFRESH_EXPIRES_IN);
    res.cookie(this.cookieName, token, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: '/',
      maxAge,
    });
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: '/',
    });
  }

  getRefreshToken(req: Request): string | undefined {
    return req.cookies?.[this.cookieName];
  }

  private parseMaxAge(expiresIn: string): number {
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
}
