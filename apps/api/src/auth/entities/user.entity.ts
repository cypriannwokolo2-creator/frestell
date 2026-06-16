export interface UserEntity {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  displayName: string | null;
  passwordHash: string | null;
  googleId: string | null;
  role: 'freelancer' | 'client' | 'admin';
  tier: 'email' | 'government_id' | 'badges';
  totpSecret: string | null;
  totpEnabled: boolean;
  totpVerifiedAt: Date | null;
  lockedUntil: Date | null;
  failedAttempts: number;
  deletedAt: Date | null;
  restoreUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionEntity {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  deviceInfo: string | null;
  ip: string | null;
  userAgent: string | null;
  expiresAt: Date;
  createdAt: Date;
  revokedAt: Date | null;
}
