export interface UserEntity {
  id: string;
  email: string;
  displayName: string | null;
  passwordHash: string | null;
  role: string;
  tier: string;
  googleId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionEntity {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
