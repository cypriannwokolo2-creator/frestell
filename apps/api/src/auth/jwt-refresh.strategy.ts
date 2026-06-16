import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ENV } from '../config/env';

interface RefreshPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      passReqToCallback: true,
      ignoreExpiration: false,
      secretOrKey: ENV.JWT_REFRESH_SECRET,
    });
  }

  async validate(req: Request, payload: RefreshPayload) {
    return { sub: payload.sub, jti: payload.jti, refreshToken: req.body?.refreshToken };
  }
}
