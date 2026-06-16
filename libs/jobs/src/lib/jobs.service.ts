import { Injectable } from '@nestjs/common';

@Injectable()
export class JobsService {
  ping(): string {
    return 'jobs-lib-ready';
  }
}
