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
  totpToken: z.string().optional(),
  twoFactorEmailOtp: z.string().length(6).optional(),
  recoveryCode: z.string().optional(),
});
export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const RefreshDtoSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshDto = z.infer<typeof RefreshDtoSchema>;

export const LogoutDtoSchema = z.object({
  refreshToken: z.string().min(1),
});
export type LogoutDto = z.infer<typeof LogoutDtoSchema>;

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
  totpEnabled: z.boolean(),
  emailVerified: z.boolean(),
  googleId: z.string().nullable(),
  hasPassword: z.boolean(),
  deletedAt: z.string().nullable(),
  restoreUntil: z.string().nullable(),
  avatarUrl: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
});
export type AuthUserResponse = z.infer<typeof AuthUserResponseSchema>;

// ─── Email Verification ──────────────────────────────────────────

export const VerifyEmailDtoSchema = z.object({
  otp: z.string().length(6),
});
export type VerifyEmailDto = z.infer<typeof VerifyEmailDtoSchema>;

export const ResendVerificationDtoSchema = z.object({
  email: z.string().email(),
});
export type ResendVerificationDto = z.infer<typeof ResendVerificationDtoSchema>;

// ─── Password Reset ───────────────────────────────────────────────

export const RequestPasswordResetDtoSchema = z.object({
  email: z.string().email(),
});
export type RequestPasswordResetDto = z.infer<typeof RequestPasswordResetDtoSchema>;

export const ResetPasswordDtoSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});
export type ResetPasswordDto = z.infer<typeof ResetPasswordDtoSchema>;

// ─── 2FA / TOTP ───────────────────────────────────────────────────

export const GenerateTotpSecretResponseSchema = z.object({
  secret: z.string(),
  qrCodeUrl: z.string(),
});
export type GenerateTotpSecretResponse = z.infer<typeof GenerateTotpSecretResponseSchema>;

export const EnableTotpDtoSchema = z.object({
  token: z.string().min(6).max(6),
});
export type EnableTotpDto = z.infer<typeof EnableTotpDtoSchema>;

export const DisableTotpDtoSchema = z.object({
  token: z.string().min(6).max(6),
});
export type DisableTotpDto = z.infer<typeof DisableTotpDtoSchema>;

export const VerifyTotpDtoSchema = z.object({
  token: z.string().min(6).max(6),
});

export const Send2faEmailOtpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type Send2faEmailOtpDto = z.infer<typeof Send2faEmailOtpSchema>;
export type VerifyTotpDto = z.infer<typeof VerifyTotpDtoSchema>;

// ─── Recovery Codes ───────────────────────────────────────────────

export const RecoveryCodesResponseSchema = z.object({
  codes: z.array(z.string()),
});
export type RecoveryCodesResponse = z.infer<typeof RecoveryCodesResponseSchema>;

export const UseRecoveryCodeDtoSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});
export type UseRecoveryCodeDto = z.infer<typeof UseRecoveryCodeDtoSchema>;

// ─── Sessions ─────────────────────────────────────────────────────

export const SessionInfoSchema = z.object({
  id: z.string().uuid(),
  deviceInfo: z.string().nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
  expiresAt: z.date(),
  isCurrent: z.boolean(),
});
export type SessionInfo = z.infer<typeof SessionInfoSchema>;

export const RevokeSessionDtoSchema = z.object({
  sessionId: z.string().uuid(),
});
export type RevokeSessionDto = z.infer<typeof RevokeSessionDtoSchema>;

// ─── Account Deletion ─────────────────────────────────────────────

export const DeleteAccountDtoSchema = z.object({
  password: z.string().optional(),
});
export type DeleteAccountDto = z.infer<typeof DeleteAccountDtoSchema>;

export const RestoreAccountDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type RestoreAccountDto = z.infer<typeof RestoreAccountDtoSchema>;

export const SendRestoreOtpDtoSchema = z.object({
  email: z.string().email(),
});
export type SendRestoreOtpDto = z.infer<typeof SendRestoreOtpDtoSchema>;

export const ConfirmRestoreOtpDtoSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
});
export type ConfirmRestoreOtpDto = z.infer<typeof ConfirmRestoreOtpDtoSchema>;

// ─── Passkey Management ───────────────────────────────────────────

export const UpdatePasskeyNameDtoSchema = z.object({
  passkeyId: z.string().uuid(),
  name: z.string().min(1).max(64),
});
export type UpdatePasskeyNameDto = z.infer<typeof UpdatePasskeyNameDtoSchema>;

export const DeletePasskeyDtoSchema = z.object({
  passkeyId: z.string().uuid(),
});
export type DeletePasskeyDto = z.infer<typeof DeletePasskeyDtoSchema>;

// ─── Set Password (for OAuth-only users) ───────────────────────────

export const SetPasswordDtoSchema = z.object({
  newPassword: z.string().min(8).max(128),
});
export type SetPasswordDto = z.infer<typeof SetPasswordDtoSchema>;

// ─── Email Change (with OTP) ──────────────────────────────────────

export const EmailChangeRequestSchema = z.object({
  newEmail: z.string().email(),
});
export type EmailChangeRequest = z.infer<typeof EmailChangeRequestSchema>;

export const EmailChangeConfirmSchema = z.object({
  otp: z.string().length(6),
  newEmail: z.string().email(),
});
export type EmailChangeConfirm = z.infer<typeof EmailChangeConfirmSchema>;

// ─── Audit Log ────────────────────────────────────────────────────

export const AuditLogEntrySchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  entity: z.string(),
  entityId: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  ip: z.string().nullable(),
  userAgent: z.string().nullable(),
  createdAt: z.date(),
});
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
