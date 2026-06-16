import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  ping(): string {
    return 'payments-lib-ready';
  }
}
