import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.module';
import { ENV } from '../config/env';

@Injectable()
export class RecoveryCodesService {
  private readonly logger = new Logger(RecoveryCodesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string): Promise<string[]> {
    await this.prisma.recoveryCode.deleteMany({ where: { userId } });

    const codes: string[] = [];
    const data: { userId: string; codeHash: string }[] = [];

    for (let i = 0; i < ENV.RECOVERY_CODES_COUNT; i++) {
      const code = this.generateCode();
      codes.push(code);
      data.push({ userId, codeHash: createHash('sha256').update(code).digest('hex') });
    }

    await this.prisma.recoveryCode.createMany({ data });
    this.logger.log(`Generated ${codes.length} recovery codes for user ${userId}`);
    return codes;
  }

  async use(userId: string, code: string): Promise<boolean> {
    const codeHash = createHash('sha256').update(code).digest('hex');
    const record = await this.prisma.recoveryCode.findFirst({
      where: { userId, codeHash, usedAt: null },
    });

    if (!record) return false;

    await this.prisma.recoveryCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return true;
  }

  async getRemainingCount(userId: string): Promise<number> {
    return this.prisma.recoveryCode.count({ where: { userId, usedAt: null } });
  }

  private generateCode(): string {
    return randomBytes(4).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-');
  }
}
