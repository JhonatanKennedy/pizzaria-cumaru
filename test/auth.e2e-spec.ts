import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const PASSWORD = 'SenhaSegura123';

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

    expect(response.body.token).toBeDefined();
    expect(response.body.user.role).toBe('Cook');
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

  it('should refuse a logged-out token', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);
    const token = loginResponse.body.token as string;

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${token}`)
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
      .set('Authorization', `Bearer ${loginResponse.body.token}`)
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
      .set('Authorization', `Bearer ${loginResponse.body.token}`)
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
      .set('Authorization', `Bearer ${loginResponse.body.token}`)
      .expect(200);
  });

  it('should refuse a Cook on the ingredient listing', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: PASSWORD })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/ingredients')
      .set('Authorization', `Bearer ${loginResponse.body.token}`)
      .expect(403);

    expect(response.body.message).toBe(
      'Access not authorized for your profile',
    );
  });
});
