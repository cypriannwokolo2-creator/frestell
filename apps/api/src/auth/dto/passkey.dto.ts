import { z } from 'zod';

export const PasskeyRegisterBeginSchema = z.object({
  displayName: z.string().min(1).max(64).optional(),
});
export type PasskeyRegisterBeginDto = z.infer<typeof PasskeyRegisterBeginSchema>;

export const PasskeyRegisterBeginResponseSchema = z.object({
  challengeId: z.string().uuid(),
  options: z.record(z.unknown()),
});
export type PasskeyRegisterBeginResponse = z.infer<typeof PasskeyRegisterBeginResponseSchema>;

export const PasskeyRegisterCompleteSchema = z.object({
  challengeId: z.string().uuid(),
  credential: z.record(z.unknown()),
  name: z.string().max(64).optional(),
});
export type PasskeyRegisterCompleteDto = z.infer<typeof PasskeyRegisterCompleteSchema>;

export const PasskeySignupBeginSchema = z.object({
  displayName: z.string().max(64).optional(),
});
export type PasskeySignupBeginDto = z.infer<typeof PasskeySignupBeginSchema>;

export const PasskeySignupCompleteSchema = z.object({
  challengeId: z.string().uuid(),
  credential: z.record(z.unknown()),
  name: z.string().max(64).optional(),
});
export type PasskeySignupCompleteDto = z.infer<typeof PasskeySignupCompleteSchema>;

export const PasskeyLoginBeginSchema = z.object({
  email: z.string().email().optional(),
});
export type PasskeyLoginBeginDto = z.infer<typeof PasskeyLoginBeginSchema>;

export const PasskeyLoginBeginResponseSchema = z.object({
  challengeId: z.string().uuid(),
  options: z.record(z.unknown()),
});
export type PasskeyLoginBeginResponse = z.infer<typeof PasskeyLoginBeginResponseSchema>;

export const PasskeyLoginCompleteSchema = z.object({
  challengeId: z.string().uuid(),
  credential: z.record(z.unknown()),
});
export type PasskeyLoginCompleteDto = z.infer<typeof PasskeyLoginCompleteSchema>;
