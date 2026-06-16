import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';

interface StoredOtp {
  otpHash: string;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;

@Injectable()
export class TwoFactorOtpStore {
  private store = new Map<string, StoredOtp>();

  create(userId: string): string {
    const otp = randomBytes(3).readUIntBE(0, 3) % 1000000;
    const code = otp.toString().padStart(6, '0');
    const otpHash = createHash('sha256').update(code).digest('hex');
    this.store.set(userId, { otpHash, createdAt: Date.now() });
    setTimeout(() => this.store.delete(userId), TTL_MS);
    return code;
  }

  verify(userId: string, code: string): boolean {
    const entry = this.store.get(userId);
    if (!entry) return false;
    if (Date.now() - entry.createdAt > TTL_MS) { this.store.delete(userId); return false; }
    const match = entry.otpHash === createHash('sha256').update(code).digest('hex');
    if (match) this.store.delete(userId);
    return match;
  }
}
