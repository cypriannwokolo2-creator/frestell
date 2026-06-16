import { Global, Module, OnApplicationShutdown, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnApplicationShutdown {
  private _client: PrismaClient | null = null;
  private readonly logger = new Logger(PrismaService.name);

  private get client(): PrismaClient {
    if (!this._client) {
      this._client = new PrismaClient({
        log: [
          { emit: 'event', level: 'error' },
          { emit: 'event', level: 'warn' },
        ],
      });
    }
    return this._client;
  }

  async onApplicationShutdown(signal?: string) {
    if (this._client) {
      await this._client.$disconnect();
      this.logger.log(`Prisma disconnected (${signal})`);
    }
  }

  get $connect() {
    return this.client.$connect.bind(this.client);
  }

  get $disconnect() {
    return this.client.$disconnect.bind(this.client);
  }

  get $queryRaw() {
    return this.client.$queryRaw.bind(this.client);
  }

  get $transaction() {
    return this.client.$transaction.bind(this.client);
  }

  // Passthrough typed methods — add as needed
  get user() {
    return this.client.user;
  }
  get session() {
    return this.client.session;
  }
  get passkey() {
    return this.client.passkey;
  }
  get identity() {
    return this.client.identity;
  }
  get job() {
    return this.client.job;
  }
  get proposal() {
    return this.client.proposal;
  }
  get escrow() {
    return this.client.escrow;
  }
  get conversation() {
    return this.client.conversation;
  }
  get message() {
    return this.client.message;
  }
  get aIDraft() {
    return this.client.aIDraft;
  }
  get verification() {
    return this.client.verification;
  }
  get auditLog() {
    return this.client.auditLog;
  }
  get twoFactor() {
    return this.client.twoFactor;
  }
  get recoveryCode() {
    return this.client.recoveryCode;
  }
  get passwordReset() {
    return this.client.passwordReset;
  }
  get loginAttempt() {
    return this.client.loginAttempt;
  }
  get portfolioItem() {
    return this.client.portfolioItem;
  }
  get serviceOffering() {
    return this.client.serviceOffering;
  }
  get skill() {
    return this.client.skill;
  }
  get userSkill() {
    return this.client.userSkill;
  }
  get skillEndorsement() {
    return this.client.skillEndorsement;
  }
  get socialLink() {
    return this.client.socialLink;
  }
  get profileView() {
    return this.client.profileView;
  }
  get acceptanceCriterion() {
    return this.client.acceptanceCriterion;
  }
  get milestone() {
    return this.client.milestone;
  }
  get jobCategory() {
    return this.client.jobCategory;
  }
  get jobChange() {
    return this.client.jobChange;
  }
  get jobAttachment() {
    return this.client.jobAttachment;
  }
  get jobView() {
    return this.client.jobView;
  }
}

@Global()
@Module({
  providers: [PrismaService, { provide: PrismaClient, useFactory: () => null }],
  exports: [PrismaService],
})
export class PrismaModule {}
