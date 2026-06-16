/**
 * Integration test bootstrap.
 *
 * Starts a Postgres testcontainer once per test run, runs migrations against it,
 * and provides a NestJS testing module that points Prisma at the test DB.
 *
 * Usage in a spec:
 *   import { startTestApp, stopTestApp } from './setup';
 *   beforeAll(async () => { app = await startTestApp(); });
 *   afterAll(async () => { await stopTestApp(app); });
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'child_process';
import { AppModule } from '../../src/app.module';
import { ENV } from '../../src/config/env';
import { CORS_ORIGIN_LIST } from '../../src/config/env';
import { AllExceptionsFilter } from '../../src/common/filters/all-exceptions.filter';
import { RequestIdInterceptor } from '../../src/common/interceptors/request-id.interceptor';

let container: StartedPostgreSqlContainer;
let moduleRef: TestingModule;
let app: INestApplication;

export async function startTestApp(): Promise<INestApplication> {
  container = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('frestell_test')
    .withUsername('frestell')
    .withPassword('frestell')
    .start();

  process.env.DATABASE_URL = container.getConnectionUri();
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'integration-test-secret-1234567890';
  process.env.NODE_ENV = 'test';

  execSync('npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma', {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
    stdio: 'inherit',
  });

  moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication({ bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(compression());
  app.enableCors({
    origin: CORS_ORIGIN_LIST.includes('*') ? true : CORS_ORIGIN_LIST,
    credentials: true,
  });
  app.setGlobalPrefix(ENV.API_PREFIX, { exclude: ['health', 'ready', 'live'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor(app.get(Logger)));
  await app.init();
  return app;
}

export async function stopTestApp(application: INestApplication): Promise<void> {
  await application?.close();
  await moduleRef?.close();
  await container?.stop();
}

export function getApp(): INestApplication {
  return app;
}
