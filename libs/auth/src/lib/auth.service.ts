import { Injectable } from '@nestjs/common';
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from './auth.module';

@Injectable()
export class AuthService {
  constructor() {}

  ping(): string {
    return 'auth-lib-ready';
  }
}

export function authServiceFactory() {
  return new AuthService();
}
