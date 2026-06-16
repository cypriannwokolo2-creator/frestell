import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import * as path from 'path';
import * as fs from 'fs';

function findEnvFile(): string | undefined {
  const explicit = process.env.ENV_FILE;
  if (explicit && fs.existsSync(explicit)) return explicit;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, '.env');
    if (fs.existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

const envFile = findEnvFile();
if (envFile) {
  loadDotenv({ path: envFile });
}

const NodeEnvSchema = z.enum(['development', 'test', 'staging', 'production']).default('development');

const EnvSchema = z.object({
  NODE_ENV: NodeEnvSchema,

  PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('api/v1'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  BASE_URL: z.string().url().default('http://localhost:3001'),
  WEBAPP_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  CHALLENGE_STORE: z.enum(['memory', 'redis']).default('memory'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters').default('change-me-refresh-secret-1234567890'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_COOKIE_NAME: z.string().default('refresh_token'),

  WEB_AUTHN_RP_NAME: z.string().default('FreStell'),
  WEB_AUTHN_RP_ID: z.string().default('localhost'),
  WEB_AUTHN_ORIGIN: z.string().url().default('http://localhost:3000'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_EMAIL: z.string().email().default('noreply@frestell.com'),
  BREVO_SENDER_NAME: z.string().default('FreStell'),

  PASSWORD_RESET_EXPIRES_IN: z.string().default('15m'),
  PASSWORD_RESET_RATE_LIMIT: z.coerce.number().int().positive().default(3),
  PASSWORD_RESET_RATE_WINDOW: z.coerce.number().int().positive().default(3600),

  LOGIN_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_DURATION: z.coerce.number().int().positive().default(900),

  ACCOUNT_DELETE_GRACE_DAYS: z.coerce.number().int().positive().default(30),

  RECOVERY_CODES_COUNT: z.coerce.number().int().min(1).max(20).default(10),

  STELLAR_NETWORK: z.enum(['TESTNET', 'PUBLIC']).default('TESTNET'),
  STELLAR_HORIZON_URL: z.string().url().default('https://horizon-testnet.stellar.org'),
  SOROBAN_RPC_URL: z.string().url().default('https://soroban-testnet.stellar.org'),
  SOROBAN_ESCROW_CONTRACT_ID: z.string().optional(),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY: z.coerce.boolean().default(false),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
  THROTTLE_WHITE_LIST: z.string().default('127.0.0.1,::1'),

  CSRF_COOKIE_NAME: z.string().default('csrf-token'),
  CSRF_SECRET: z.string().optional(),

  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
});

export type AppEnv = z.infer<typeof EnvSchema>;

function parseEnv(): AppEnv {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.errors
      .map((e) => `  - ${e.path.join('.') || '(root)'}: ${e.message}`)
      .join('\n');
    // eslint-disable-next-line no-console
    console.error(`\n[env] Invalid environment variables:\n${formatted}\n`);
    process.exit(1);
  }
  return result.data;
}

export const ENV = parseEnv();

export const IS_PROD = ENV.NODE_ENV === 'production';
export const IS_DEV = ENV.NODE_ENV === 'development';
export const IS_TEST = ENV.NODE_ENV === 'test';

export const CORS_ORIGIN_LIST = ENV.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean);
export const THROTTLE_WHITE_LIST = ENV.THROTTLE_WHITE_LIST.split(',').map((s) => s.trim()).filter(Boolean);
