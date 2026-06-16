import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';
import { ENV } from '../config/env';

export function setupSwagger(app: INestApplication): void {
  if (ENV.NODE_ENV === 'production') return;

  const config = new DocumentBuilder()
    .setTitle('FreStell API')
    .setDescription('Trustless freelance marketplace on Stellar + Soroban')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addApiKey({ type: 'apiKey', name: 'x-request-id', in: 'header' }, 'request-id')
    .addTag('health')
    .addTag('auth')
    .addTag('users')
    .addTag('jobs')
    .addTag('payments')
    .addTag('chat')
    .addTag('ai')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${ENV.API_PREFIX}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
