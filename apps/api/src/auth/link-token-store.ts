import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

interface StoredLink {
  userId: string;
  createdAt: number;
}

const TTL_MS = 5 * 60 * 1000;

@Injectable()
export class LinkTokenStore {
  private store = new Map<string, StoredLink>();

  create(userId: string): string {
    const token = randomUUID();
    this.store.set(token, { userId, createdAt: Date.now() });
    setTimeout(() => this.store.delete(token), TTL_MS);
    return token;
  }

  peek(token: string): string | null {
    const entry = this.store.get(token);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > TTL_MS) { this.store.delete(token); return null; }
    return entry.userId;
  }

  consume(token: string): string | null {
    const entry = this.store.get(token);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > TTL_MS) { this.store.delete(token); return null; }
    this.store.delete(token);
    return entry.userId;
  }
}
