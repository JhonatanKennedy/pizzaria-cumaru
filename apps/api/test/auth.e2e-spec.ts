import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { REFRESH_TOKEN_MAX_AGE_MS } from './../src/users/application/session-tokens.js';
import { REFRESH_COOKIE_NAME } from './../src/users/presentation/session-cookie.js';

const PASSWORD = 'SenhaSegura123';

// The raw cookie, name and value included — `attributes` drops the name=value
// pair so a flag can be asserted as a whole attribute rather than as a
// substring that a base64url JWT might happen to contain.
function findRefreshCookie(response: request.Response): string {
  const header = response.headers['set-cookie'];
  const cookies = Array.isArray(header) ? header : [header];
  const cookie = cookies.find((entry) =>
    entry?.startsWith(`${REFRESH_COOKIE_NAME}=`),
  );

  if (!cookie) {
    throw new Error(`No ${REFRESH_COOKIE_NAME} cookie on the response`);
  }

  return cookie;
}

function attributesOf(cookie: string): string[] {
  return cookie
    .split(';')
    .slice(1)
    .map((attribute) => attribute.trim());
}

function valueOf(cookie: string): string {
  return cookie.slice(0, cookie.indexOf(';')).split('=').slice(1).join('=');
}

// What a browser sends back: the name=value pair, without the attributes.
function cookieHeaderOf(cookie: string): string {
  return cookie.slice(0, cookie.indexOf(';'));
}

describe('Authentication and authorization (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let passwordHash: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.deniedToken.deleteMany();
    await prisma.user.deleteMany();
    passwordHash = bcrypt.hashSync(PASSWORD, 4);

    for (const [login, role] of [
      ['ana.gerente', 'Manager'],
      ['joao.garcom', 'Waiter'],
      ['carlos.cozinha', 'Cook'],
    ] as const) {
      await prisma.user.create({
        data: { email: login, name: login, role, passwordHash },
      });
    }
  });

  afterEach(async () => {
    await app.close();
  });

  it('should login successfully and return the role', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.role).toBe('Cook');
  });

  it('should set the refresh token in a cookie scoped to /auth', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);

    const cookie = findRefreshCookie(response);
    const attributes = attributesOf(cookie);

    expect(valueOf(cookie)).toBeTruthy();
    expect(attributes).toContain('HttpOnly');
    expect(attributes).toContain('Path=/auth');
    expect(attributes).toContain('SameSite=Lax');
    expect(attributes).toContain(`Max-Age=${REFRESH_TOKEN_MAX_AGE_MS / 1000}`);
    // `Secure` rides on TLS, so it is off in this suite and would keep the dev
    // server from ever storing the cookie. Asserted as its own attribute: a
    // flag that is silently absent reads exactly like one that works.
    expect(attributes).not.toContain('Secure');
  });

  it('should keep the refresh token out of the response body', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);

    const refreshToken = valueOf(findRefreshCookie(response));

    expect(refreshToken).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain(refreshToken);
  });

  it('should give the access token a different value from the refresh token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);

    expect(response.body.accessToken).not.toBe(
      valueOf(findRefreshCookie(response)),
    );
  });

  it('should rotate the session on refresh', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);
    const firstCookie = findRefreshCookie(loginResponse);

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeaderOf(firstCookie))
      .expect(201);

    const secondCookie = findRefreshCookie(refreshResponse);

    expect(refreshResponse.body.accessToken).toBeDefined();
    expect(valueOf(secondCookie)).not.toBe(valueOf(firstCookie));
    expect(JSON.stringify(refreshResponse.body)).not.toContain(
      valueOf(secondCookie),
    );
  });

  it('should refuse a refresh with no cookie', async () => {
    await request(app.getHttpServer()).post('/auth/refresh').expect(401);
  });

  it('should refuse a refresh with a malformed cookie', async () => {
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', `${REFRESH_COOKIE_NAME}=not-a-jwt`)
      .expect(401);
  });

  it('should refuse a replay of the cookie a refresh replaced', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);
    const spentCookie = findRefreshCookie(loginResponse);

    const rotated = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeaderOf(spentCookie))
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeaderOf(spentCookie))
      .expect(401);

    // The rotation guarantee: refusing the replay did not end the session the
    // newest token is still holding open.
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeaderOf(findRefreshCookie(rotated)))
      .expect(201);
  });

  it('should end the session on logout even with a dead access token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'joao.garcom', password: PASSWORD })
      .expect(201);
    const cookie = findRefreshCookie(loginResponse);

    // No bearer header at all — the cookie is what logout acts on, which is the
    // regression the old guarded logout had: an idle client's access token
    // would already be expired, so logging out would 401 and leave a live
    // refresh cookie in the browser.
    const logoutResponse = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookieHeaderOf(cookie))
      .expect(201);

    const cleared = findRefreshCookie(logoutResponse);
    expect(valueOf(cleared)).toBe('');
    expect(attributesOf(cleared)).toContain('Path=/auth');

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookieHeaderOf(cookie))
      .expect(401);
  });

  it('should clear the cookie on logout without a cookie to revoke', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/logout')
      .expect(201);

    expect(valueOf(findRefreshCookie(response))).toBe('');
  });

  it('should refuse an invalid password with the spec message', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'joao.garcom', password: 'senhaErrada' })
      .expect(400);

    expect(response.body.message).toBe('Invalid username or password');
  });

  it('should lock the account after five consecutive failures', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'joao.garcom', password: 'senhaErrada' })
        .expect(400);
    }

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'joao.garcom', password: PASSWORD })
      .expect(400);

    expect(response.body.message).toBe(
      'Account locked. Try again in 15 minutes',
    );
  });

  it('should refuse a request carrying a refresh token as its bearer', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);
    const refreshToken = valueOf(findRefreshCookie(loginResponse));

    // The cookie's value is a valid JWT with the right `sub`, `role` and `jti`.
    // It is refused because it is signed with the refresh secret, not because
    // anything about its payload is wrong — which is the whole point of the
    // second secret.
    await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);
  });

  it('should refuse requests without a token', async () => {
    await request(app.getHttpServer()).get('/kitchen/queue').expect(401);
  });

  it('should refuse a Waiter on the kitchen queue', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'joao.garcom', password: PASSWORD })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(403);

    expect(response.body.message).toBe(
      'Access not authorized for your profile',
    );
  });

  it('should refuse a Waiter closing an order with the specific message', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'joao.garcom', password: PASSWORD })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/orders/any/close')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .send({ paymentType: 'Cash' })
      .expect(403);

    expect(response.body.message).toBe('Only the manager can close the order');
  });

  it('should grant the Cook the kitchen queue', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);

    await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);
  });

  it('should refuse a Cook on the ingredient listing', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/ingredients')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(403);

    expect(response.body.message).toBe(
      'Access not authorized for your profile',
    );
  });
});
