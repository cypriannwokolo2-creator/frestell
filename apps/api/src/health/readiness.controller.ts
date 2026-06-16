import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.module';

@ApiTags('health')
@Controller('ready')
export class ReadinessController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Readiness probe — fails if any required dependency is down' })
  @ApiResponse({ status: 200, description: 'Service is ready to accept traffic' })
  @ApiResponse({ status: 503, description: 'A required dependency is unavailable' })
  async check() {
    const checks: Record<string, { status: 'up' | 'down'; latencyMs?: number; error?: string }> = {};

    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up', latencyMs: Date.now() - dbStart };
    } catch (e) {
      checks.database = {
        status: 'down',
        latencyMs: Date.now() - dbStart,
        error: e instanceof Error ? e.message : 'unknown',
      };
    }

    const allUp = Object.values(checks).every((c) => c.status === 'up');
    if (!allUp) {
      throw new HttpException({ statusCode: 503, message: 'Not ready', checks }, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return { status: 'ready', checks, timestamp: new Date().toISOString() };
  }
}
