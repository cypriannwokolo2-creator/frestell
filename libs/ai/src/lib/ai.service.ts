import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  ping(): string {
    return 'ai-lib-ready';
  }
}
