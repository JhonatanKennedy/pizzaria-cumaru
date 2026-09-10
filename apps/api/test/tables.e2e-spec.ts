import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const MANAGER_PASSWORD_HASH = bcrypt.hashSync('SenhaSegura123', 4);

describe('Table management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let managerToken = '';
  let waiterToken = '';
  let waiterId: number;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.orderItem.deleteMany();
    await prisma.orderCancellation.deleteMany();
    await prisma.order.deleteMany();
    await prisma.table.deleteMany();
    await prisma.itemIngredient.deleteMany();
    await prisma.item.deleteMany();
    await prisma.ingredient.deleteMany();
    await prisma.user.deleteMany();

    await prisma.user.create({
      data: {
        email: 'ana.gerente',
        name: 'Ana Gerente',
        role: 'Manager',
        passwordHash: MANAGER_PASSWORD_HASH,
      },
    });
    const waiter = await prisma.user.create({
      data: {
        email: 'joao.garcom',
        name: 'João Garçom',
        role: 'Waiter',
        passwordHash: MANAGER_PASSWORD_HASH,
      },
    });
    waiterId = waiter.id;

    const managerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'ana.gerente', password: 'SenhaSegura123' })
      .expect(201);
    managerToken = managerLogin.body.token as string;

    const waiterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'joao.garcom', password: 'SenhaSegura123' })
      .expect(201);
    waiterToken = waiterLogin.body.token as string;
  });

  afterEach(async () => {
    await app.close();
  });

  it('should register a table and list it free for the waiter', async () => {
    await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 3 })
      .expect(201);

    const listing = await request(app.getHttpServer())
      .get('/tables')
      .set('Authorization', `Bearer ${waiterToken}`)
      .expect(200);

    expect(listing.body).toHaveLength(1);
    expect(listing.body[0].number).toBe(3);
    expect(listing.body[0].openOrder).toBeNull();
  });

  it('should refuse a duplicate table number', async () => {
    await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 3 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 3 })
      .expect(400);

    expect(response.body.message).toBe('Table number already exists');
  });

  it('should refuse a table number below one', async () => {
    await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 0 })
      .expect(400);
  });

  it('should show the open order of an occupied table', async () => {
    await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 5 })
      .expect(201);

    const table = await prisma.table.findFirstOrThrow({
      where: { number: 5 },
    });
    const createdOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: table.id })
      .expect(201);

    const listing = await request(app.getHttpServer())
      .get('/tables')
      .set('Authorization', `Bearer ${waiterToken}`)
      .expect(200);

    expect(listing.body).toHaveLength(1);
    expect(listing.body[0].openOrder).toEqual({
      orderId: createdOrder.body.id,
      totalPrice: 0,
    });
  });

  it('should refuse an order for an unregistered table', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: 'ghost-table' })
      .expect(400);

    expect(response.body.message).toBe('Table not found');
  });

  it('should renumber a table', async () => {
    await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 3 })
      .expect(201);

    const table = await prisma.table.findFirstOrThrow({
      where: { number: 3 },
    });
    await request(app.getHttpServer())
      .patch(`/tables/${table.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 4 })
      .expect(200);

    const listing = await request(app.getHttpServer())
      .get('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(listing.body).toHaveLength(1);
    expect(listing.body[0].number).toBe(4);
  });

  it('should refuse deleting a table that has orders', async () => {
    await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 6 })
      .expect(201);

    const table = await prisma.table.findFirstOrThrow({
      where: { number: 6 },
    });
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: table.id })
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/tables/${table.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(400);

    expect(response.body.message).toBe('Cannot delete a table that has orders');
  });

  it('should delete a free table', async () => {
    await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ number: 7 })
      .expect(201);

    const table = await prisma.table.findFirstOrThrow({
      where: { number: 7 },
    });
    await request(app.getHttpServer())
      .delete(`/tables/${table.id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    const listing = await request(app.getHttpServer())
      .get('/tables')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(listing.body).toHaveLength(0);
  });

  it('should refuse a waiter registering a table', async () => {
    const response = await request(app.getHttpServer())
      .post('/tables')
      .set('Authorization', `Bearer ${waiterToken}`)
      .send({ number: 8 })
      .expect(403);

    expect(response.body.message).toBe(
      'Access not authorized for your profile',
    );
  });

  it('should refuse listing tables without a token', async () => {
    await request(app.getHttpServer()).get('/tables').expect(401);
  });
});
