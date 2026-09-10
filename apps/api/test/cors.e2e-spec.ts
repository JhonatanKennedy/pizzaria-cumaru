import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { buildCorsOptions, parseCorsOrigins } from './../src/config/cors.js';

const ALLOWED_ORIGIN = 'http://localhost:5173';
const FOREIGN_ORIGIN = 'https://evil.example.com';
const WRONG_CREDENTIALS = { login: 'joao.garcom', password: 'senhaErrada' };

// The origin policy is applied in `main.ts`, which no other spec executes: the
// other e2e suites build the app without CORS at all. This one wires it the
// same way main.ts does and asserts the headers a browser would act on.
describe('Origin policy (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors(buildCorsOptions(parseCorsOrigins(ALLOWED_ORIGIN)));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should reflect an allowlisted origin', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(WRONG_CREDENTIALS);

    expect(response.headers['access-control-allow-origin']).toBe(
      ALLOWED_ORIGIN,
    );
  });

  it('should let an allowlisted origin carry the session cookie', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .send(WRONG_CREDENTIALS);

    // Without this header the browser discards the login response's Set-Cookie
    // and no session is ever established, so the two travel together.
    expect(response.headers['access-control-allow-credentials']).toBe('true');
    expect(response.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('should answer a foreign origin without a permissive header, and without an error', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Origin', FOREIGN_ORIGIN)
      .send(WRONG_CREDENTIALS);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
    expect(response.status).toBe(400);
  });

  it('should leave a caller that sends no origin unaffected', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(WRONG_CREDENTIALS);

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.status).toBe(400);
  });

  it('should grant credentials on an allowlisted preflight', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe(
      ALLOWED_ORIGIN,
    );
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should not grant a foreign origin a credentialed preflight', async () => {
    const response = await request(app.getHttpServer())
      .options('/auth/login')
      .set('Origin', FOREIGN_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(
      response.headers['access-control-allow-credentials'],
    ).toBeUndefined();
  });
});
