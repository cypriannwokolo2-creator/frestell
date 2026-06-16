import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { startTestApp, stopTestApp } from './setup';

describe('Health endpoints (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await startTestApp();
  }, 60_000);

  afterAll(async () => {
    await stopTestApp(app);
  });

  it('GET /live returns alive', async () => {
    const res = await request(app.getHttpServer()).get('/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('alive');
  });

  it('GET /health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /ready returns ready when DB is reachable', async () => {
    const res = await request(app.getHttpServer()).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.checks.database.status).toBe('up');
  });

  it('sets x-request-id on responses', async () => {
    const res = await request(app.getHttpServer()).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('echoes an inbound x-request-id', async () => {
    const id = 'test-request-id-12345';
    const res = await request(app.getHttpServer()).get('/health').set('x-request-id', id);
    expect(res.headers['x-request-id']).toBe(id);
  });
});
