import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const MANAGER_PASSWORD_HASH = bcrypt.hashSync('SenhaSegura123', 4);

describe('Order creation (e2e)', () => {
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
    await prisma.item.create({
      data: {
        name: 'Calabresa',
        description: 'Pizza de calabresa',
        price: 40,
        category: 'PIZZA',
        requiresPreparation: true,
        ingredients: { create: [{ ingredientId: mussarela.id }] },
      },
    });
    await prisma.item.create({
      data: {
        name: 'Portuguesa',
        description: 'Pizza portuguesa',
        price: 46,
        category: 'PIZZA',
        requiresPreparation: true,
        ingredients: { create: [{ ingredientId: mussarela.id }] },
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

  it('should create a local order, add a split pizza priced at the highest flavor, and queue it', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '5' })
      .expect(201);

    const orderId = created.body.id as string;
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });

    await request(app.getHttpServer())
      .post(`/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id, flavors: ['Calabresa', 'Portuguesa'] })
      .expect(201);

    const stored = await prisma.orderItem.findFirstOrThrow({
      where: { orderId },
    });
    expect(stored.unitPrice).toBe(46);
    expect(stored.flavors).toEqual(['Calabresa', 'Portuguesa']);

    const queue = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(queue.body.local).toHaveLength(1);
    expect(queue.body.local[0].items[0].name).toBe('Calabresa');
  });

  it('should refuse a delivery order without an address with the spec message', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: 1,
        type: 'Delivery',
        customerName: 'Maria Souza',
      })
      .expect(400);

    expect(response.body.message).toBe(
      'Delivery address is required for delivery',
    );
  });

  it('should refuse a second open order for the same table', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '8' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '8' })
      .expect(400);

    expect(response.body.message).toBe('Table already has an open order');
  });

  it('should refuse adding an item whose ingredient is unavailable', async () => {
    await prisma.ingredient.updateMany({ data: { inStock: false } });
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '9' })
      .expect(201);

    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });
    const response = await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(400);

    expect(response.body.message).toBe('Item is unavailable');
  });
});
