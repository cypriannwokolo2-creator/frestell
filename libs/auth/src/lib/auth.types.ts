export type AuthProvider = 'webauthn' | 'jwt' | 'oauth';

export interface UserPrincipal {
  id: string;
  email: string;
  displayName?: string;
  providers: AuthProvider[];
  tier: VerificationTier;
}

export type VerificationTier = 'email' | 'government_id' | 'badges';

export interface PasskeyRegistrationOptions {
  challenge: string;
  rp: { name: string; id: string };
  user: { id: string; name: string; displayName: string };
  pubKeyCredParams: { type: 'public-key'; alg: number }[];
  timeout: number;
  attestation: 'none' | 'indirect' | 'direct';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}
