import { z } from 'zod';

// ─── Email + Password ─────────────────────────────────────────────

export const RegisterDtoSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(64).optional(),
  role: z.enum(['freelancer', 'client']).default('freelancer'),
});
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const LoginDtoSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});
export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const RefreshDtoSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof RefreshDtoSchema>;

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  tokenType: z.literal('Bearer').default('Bearer'),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;

export const AuthUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: z.enum(['freelancer', 'client', 'admin']),
  tier: z.enum(['email', 'government_id', 'badges']),
  hasPasskey: z.boolean(),
});
export type AuthUserResponse = z.infer<typeof AuthUserResponseSchema>;

// ─── Passkey ──────────────────────────────────────────────────────

export const PasskeyRegisterBeginSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
});
export type PasskeyRegisterBeginDto = z.infer<typeof PasskeyRegisterBeginSchema>;

export const PasskeyRegisterCompleteSchema = z.object({
  challengeId: z.string().uuid(),
  credential: z.record(z.unknown()),
  name: z.string().max(64).optional(),
});
export type PasskeyRegisterCompleteDto = z.infer<typeof PasskeyRegisterCompleteSchema>;

export const PasskeyLoginBeginSchema = z.object({
  email: z.string().email().optional(),
});
export type PasskeyLoginBeginDto = z.infer<typeof PasskeyLoginBeginSchema>;

export const PasskeyLoginCompleteSchema = z.object({
  challengeId: z.string().uuid(),
  credential: z.record(z.unknown()),
});
export type PasskeyLoginCompleteDto = z.infer<typeof PasskeyLoginCompleteSchema>;

// ─── Legacy aliases (for backward compat with existing imports) ────

export const RegisterSchema = RegisterDtoSchema;
export const LoginEmailSchema = LoginDtoSchema;
export const TokenResponseSchema = TokenPairSchema;
export const PasskeyRegistrationFinishSchema = PasskeyRegisterCompleteSchema;
export const PasskeyLoginFinishSchema = PasskeyLoginCompleteSchema;
