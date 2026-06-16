import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorDevice,
  PublicKeyCredentialDescriptorFuture,
} from '@simplewebauthn/types';
import { PrismaService } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { ChallengeStore } from './challenge-store';
import { ENV } from '../config/env';
import { AuditService } from '../audit/audit.service';

function toExcludeDescriptor(credentialId: string, transports: string[]): PublicKeyCredentialDescriptorFuture {
  return {
    id: Uint8Array.from(Buffer.from(credentialId, 'base64url')),
    type: 'public-key',
    transports: transports as any,
  };
}

function toAuthenticatorDevice(
  credentialId: string, publicKey: Buffer, counter: number, transports: string[],
): AuthenticatorDevice {
  return {
    credentialID: Uint8Array.from(Buffer.from(credentialId, 'base64url')),
    credentialPublicKey: new Uint8Array(publicKey),
    counter: Number(counter),
    transports: transports as any,
  };
}

@Injectable()
export class PasskeyService {
  private readonly logger = new Logger(PasskeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly challengeStore: ChallengeStore,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  async generateRegistrationOptions(userId: string, displayName?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    const existing = await this.prisma.passkey.findMany({
      where: { userId }, select: { credentialId: true, transports: true },
    });

    const rawOptions = await generateRegistrationOptions({
      rpName: ENV.WEB_AUTHN_RP_NAME,
      rpID: ENV.WEB_AUTHN_RP_ID,
      userID: user.id,
      userName: user.email,
      userDisplayName: displayName ?? user.displayName ?? user.email,
      attestationType: 'none',
      excludeCredentials: existing.map((c) => toExcludeDescriptor(c.credentialId, c.transports as string[])),
    });

    const challengeId = this.challengeStore.set(userId, null, rawOptions.challenge);
    return { challengeId, options: rawOptions };
  }

  async verifyRegistration(
    userId: string, challengeId: string,
    credential: RegistrationResponseJSON, name?: string,
  ) {
    const stored = this.challengeStore.get(challengeId);
    if (!stored || stored.userId !== userId) throw new BadRequestException('Challenge expired or invalid');

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: ENV.WEB_AUTHN_ORIGIN,
      expectedRPID: ENV.WEB_AUTHN_RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey verification failed');
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    await this.prisma.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credentialPublicKey),
        counter: Number(counter),
        transports: credential.response.transports ?? [],
        name: name ?? `Device ${new Date().toLocaleDateString()}`,
      },
    });

    this.challengeStore.delete(challengeId);
    await this.auditService.log({ userId, action: 'passkey.register', entity: 'passkey', entityId: credential.id });
    this.logger.log(`Passkey registered for user ${userId}`);
    return { credentialId: credential.id };
  }

  async generateAuthenticationOptions(email?: string) {
    let allowCredentials: PublicKeyCredentialDescriptorFuture[] | undefined;

    if (email) {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (user) {
        const keys = await this.prisma.passkey.findMany({
          where: { userId: user.id }, select: { credentialId: true, transports: true },
        });
        if (keys.length > 0) {
          allowCredentials = keys.map((k) => toExcludeDescriptor(k.credentialId, k.transports as string[]));
        }
      }
    }

    const rawOptions = await generateAuthenticationOptions({
      rpID: ENV.WEB_AUTHN_RP_ID, allowCredentials, userVerification: 'preferred',
    });

    const challengeId = this.challengeStore.set(null, email ?? null, rawOptions.challenge);
    return { challengeId, options: rawOptions };
  }

  async listPasskeys(userId: string) {
    return this.prisma.passkey.findMany({
      where: { userId },
      select: { id: true, name: true, credentialId: true, transports: true, createdAt: true, lastUsedAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePasskeyName(userId: string, passkeyId: string, name: string) {
    const passkey = await this.prisma.passkey.findFirst({ where: { id: passkeyId, userId } });
    if (!passkey) throw new BadRequestException('Passkey not found');
    return this.prisma.passkey.update({ where: { id: passkeyId }, data: { name } });
  }

  async deletePasskey(userId: string, passkeyId: string) {
    const passkey = await this.prisma.passkey.findFirst({ where: { id: passkeyId, userId } });
    if (!passkey) throw new BadRequestException('Passkey not found');
    await this.prisma.passkey.delete({ where: { id: passkeyId } });
    await this.auditService.log({ userId, action: 'passkey.delete', entity: 'passkey', entityId: passkeyId });
  }

  async generateSignupOptions(displayName?: string) {
    const rawOptions = await generateRegistrationOptions({
      rpName: ENV.WEB_AUTHN_RP_NAME,
      rpID: ENV.WEB_AUTHN_RP_ID,
      userID: randomUUID(),
      userName: randomUUID(),
      userDisplayName: displayName ?? 'Passkey User',
      attestationType: 'none',
    });

    const challengeId = this.challengeStore.set(null, null, rawOptions.challenge);
    return { challengeId, options: rawOptions };
  }

  async verifySignup(
    challengeId: string, credential: RegistrationResponseJSON,
    name?: string,
  ) {
    const stored = this.challengeStore.get(challengeId);
    if (!stored) throw new BadRequestException('Challenge expired or invalid');

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: ENV.WEB_AUTHN_ORIGIN,
      expectedRPID: ENV.WEB_AUTHN_RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Passkey verification failed');
    }

    const placeholderEmail = `passkey-${randomUUID().replace(/-/g, '').slice(0, 12)}@passkey.frestell.com`;
    const user = await this.prisma.user.create({
      data: { email: placeholderEmail, displayName: name ?? null, emailVerifiedAt: null },
    });

    await this.prisma.passkey.create({
      data: {
        userId: user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(verification.registrationInfo.credentialPublicKey),
        counter: Number(verification.registrationInfo.counter),
        transports: credential.response.transports ?? [],
        name: name ?? 'Primary Passkey',
      },
    });

    this.challengeStore.delete(challengeId);
    await this.auditService.log({ userId: user.id, action: 'passkey.register', entity: 'passkey', entityId: credential.id });

    const tokens = await this.authService.createTokenPair(user.id);
    return { user: { ...this.authService.mapUser({ ...user, passwordHash: null }), hasPasskey: true }, tokens };
  }

  async verifyAuthentication(challengeId: string, credential: AuthenticationResponseJSON) {
    const stored = this.challengeStore.get(challengeId);
    if (!stored) throw new BadRequestException('Challenge expired');

    const passkey = await this.prisma.passkey.findUnique({
      where: { credentialId: credential.id }, include: { user: true },
    });
    if (!passkey) throw new BadRequestException('Passkey not found');

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: stored.challenge,
      expectedOrigin: ENV.WEB_AUTHN_ORIGIN,
      expectedRPID: ENV.WEB_AUTHN_RP_ID,
      authenticator: toAuthenticatorDevice(
        passkey.credentialId, passkey.publicKey, Number(passkey.counter), passkey.transports as string[],
      ),
    });

    if (!verification.verified) throw new BadRequestException('Passkey authentication failed');

    await this.prisma.passkey.update({
      where: { id: passkey.id },
      data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
    });

    this.challengeStore.delete(challengeId);
    this.logger.log(`Passkey login for user ${passkey.userId}`);

    const tokens = await this.authService.createTokenPair(passkey.userId);
    const user = this.authService.mapUser(passkey.user);

    return { user: { ...user, hasPasskey: true }, tokens };
  }
}
