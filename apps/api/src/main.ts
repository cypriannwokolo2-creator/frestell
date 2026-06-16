import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { setupSwagger } from './swagger/swagger.config';
import { ENV, CORS_ORIGIN_LIST, IS_PROD } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(PinoLogger));

  app.setGlobalPrefix(ENV.API_PREFIX, { exclude: ['health', 'ready', 'live'] });

  app.use(helmet({ contentSecurityPolicy: IS_PROD ? undefined : false }));
  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (CORS_ORIGIN_LIST.includes('*') || CORS_ORIGIN_LIST.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-idempotency-key', 'x-csrf-token'],
    exposedHeaders: ['x-request-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  setupSwagger(app);

  await app.listen(ENV.PORT, '0.0.0.0');

  const logger = app.get(PinoLogger);
  logger.log(`API listening on http://localhost:${ENV.PORT}/${ENV.API_PREFIX} (${ENV.NODE_ENV})`);
  if (!IS_PROD) {
    logger.log(`Swagger UI: http://localhost:${ENV.PORT}/${ENV.API_PREFIX}/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error', err);
  process.exit(1);
});
