import { Module } from '@nestjs/common';

export const AUTH_MODULE_OPTIONS = 'AUTH_MODULE_OPTIONS';

export interface AuthModuleOptions {
  jwtSecret: string;
  jwtExpiresIn: string;
  rpName: string;
  rpId: string;
  origin: string;
}

@Module({})
export class AuthLibModule {}
