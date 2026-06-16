import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';

interface StoredOtp {
  otpHash: string;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;

@Injectable()
export class RestoreOtpStore {
  private store = new Map<string, StoredOtp>();

  create(key: string): string {
    const otp = randomBytes(3).readUIntBE(0, 3) % 1000000;
    const code = otp.toString().padStart(6, '0');
    const otpHash = createHash('sha256').update(code).digest('hex');
    this.store.set(key, { otpHash, createdAt: Date.now() });
    setTimeout(() => this.store.delete(key), TTL_MS);
    return code;
  }

  verify(key: string, code: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() - entry.createdAt > TTL_MS) { this.store.delete(key); return false; }
    const match = entry.otpHash === createHash('sha256').update(code).digest('hex');
    if (match) this.store.delete(key);
    return match;
  }
}