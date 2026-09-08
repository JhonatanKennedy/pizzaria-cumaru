import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const MANAGER_PASSWORD_HASH = bcrypt.hashSync('SenhaSegura123', 4);

const LOCAL_ORDER_ID = 'order-local-1';
const PIZZA_ITEM_ID = 'order-item-pizza-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

describe('Order status and kitchen queue (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authToken = '';

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
    await prisma.itemIngredient.deleteMany();
    await prisma.item.deleteMany();
    await prisma.ingredient.deleteMany();

    const mussarela = await prisma.ingredient.create({
      data: { name: 'Mussarela', inStock: true },
    });
    const calabresa = await prisma.item.create({
      data: {
        name: 'Calabresa',
        description: 'Pizza de calabresa',
        price: 45,
        category: 'PIZZA',
        requiresPreparation: true,
        ingredients: { create: [{ ingredientId: mussarela.id }] },
      },
    });
    await prisma.item.create({
      data: {
        name: 'Água',
        description: 'Garrafa de água',
        price: 8,
        category: 'DRINK',
        requiresPreparation: false,
      },
    });

    await prisma.order.create({
      data: {
        id: LOCAL_ORDER_ID,
        userId: 1,
        type: 'Local',
        status: 'Open',
        paymentType: 'Cash',
        tableId: '3',
        createdAt: CREATED_AT,
        items: {
          create: [
            {
              id: PIZZA_ITEM_ID,
              itemId: calabresa.id,
              unitPrice: 45,
              quantity: 1,
              status: 'Pending',
              requiresPreparation: true,
              createdAt: CREATED_AT,
            },
            {
              id: 'order-item-drink-1',
              itemId: 'agua',
              unitPrice: 8,
              quantity: 1,
              status: null,
              requiresPreparation: false,
              createdAt: CREATED_AT,
            },
          ],
        },
      },
    });
    await prisma.user.upsert({
      where: { email: 'ana.gerente' },
      update: { role: 'Manager', passwordHash: MANAGER_PASSWORD_HASH },
      create: {
        email: 'ana.gerente',
        name: 'Ana Gerente',
        role: 'Manager',
        passwordHash: MANAGER_PASSWORD_HASH,
      },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ login: 'ana.gerente', password: 'SenhaSegura123' })
      .expect(201);
    authToken = loginResponse.body.token as string;
  });

  afterEach(async () => {
    await app.close();
  });

  it('should start an item and show it with the Preparing badge in the kitchen queue', async () => {
    await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Preparing' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.local).toHaveLength(1);
    expect(response.body.local[0].tableId).toBe('3');
    expect(response.body.local[0].items).toHaveLength(1);
    expect(response.body.local[0].items[0].name).toBe('Calabresa');
    expect(response.body.local[0].items[0].status).toBe('Preparing');
  });

  it('should finish an item and remove it from the kitchen queue', async () => {
    await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Preparing' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Ready' })
      .expect(200);

    const response = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.local).toHaveLength(0);
  });

  it('should hide queue items when an ingredient becomes unavailable', async () => {
    await prisma.ingredient.updateMany({ data: { inStock: false } });

    const response = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.local).toHaveLength(0);
    expect(response.body.delivery).toHaveLength(0);
  });

  it('should cancel a pending item, recording the reason', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/cancellation`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: 'Customer gave up' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.local).toHaveLength(0);
    const order = await prisma.order.findUnique({
      where: { id: LOCAL_ORDER_ID },
      include: { cancellations: true },
    });
    expect(order?.cancellations).toHaveLength(1);
    expect(order?.cancellations[0].reason).toBe('Customer gave up');
  });

  it('should return 400 with the domain message on an invalid transition', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Ready' })
      .expect(400);

    expect(response.body.message).toBe('Item is not in preparation');
  });

  it('should return 400 when the status value is not allowed', async () => {
    await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Banana' })
      .expect(400);
  });

  it('should return 400 when cancelling without a reason', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/cancellation`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(400);
  });

  it('should return 400 with the domain message for a nonexistent order', async () => {
    const response = await request(app.getHttpServer())
      .patch('/orders/none/items/none/status')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Preparing' })
      .expect(400);

    expect(response.body.message).toBe('Order not found');
  });
});
