import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('live')
export class LivenessController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe — process is up and responsive' })
  check() {
    return {
      status: 'alive',
      pid: process.pid,
      timestamp: new Date().toISOString(),
    };
  }
}
