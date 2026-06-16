import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  ping(): string {
    return 'chat-lib-ready';
  }
}
