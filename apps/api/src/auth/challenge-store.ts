import { Injectable, Logger } from '@nestjs/common';
import { ENV } from '../config/env';

interface StoredChallenge {
  userId: string | null;
  email: string | null;
  challenge: string;
  createdAt: number;
}

@Injectable()
export class ChallengeStore {
  private readonly store = new Map<string, StoredChallenge>();
  private readonly logger = new Logger(ChallengeStore.name);
  private readonly TTL_MS = 5 * 60 * 1000;

  constructor() {
    setInterval(() => this.cleanup(), 60_000);
  }

  set(userId: string | null, email: string | null, challenge: string): string {
    const challengeId = crypto.randomUUID();
    this.store.set(challengeId, { userId, email, challenge, createdAt: Date.now() });
    return challengeId;
  }

  get(challengeId: string): StoredChallenge | null {
    const entry = this.store.get(challengeId);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.TTL_MS) {
      this.store.delete(challengeId);
      return null;
    }
    return entry;
  }

  delete(challengeId: string): void {
    this.store.delete(challengeId);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, e] of this.store) {
      if (now - e.createdAt > this.TTL_MS) this.store.delete(id);
    }
  }
}
