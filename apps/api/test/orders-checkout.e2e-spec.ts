import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const MANAGER_PASSWORD_HASH = bcrypt.hashSync('SenhaSegura123', 4);

describe('Orders checkout (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authToken = '';
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

    for (const tableId of ['12', '10', '9']) {
      await prisma.table.create({
        data: { id: tableId, number: Number(tableId) },
      });
    }

    const waiter = await prisma.user.create({
      data: {
        email: 'joao@pizzaria.com',
        name: 'João Garçom',
        role: 'Waiter',
        passwordHash: MANAGER_PASSWORD_HASH,
      },
    });
    waiterId = waiter.id;

    const mussarela = await prisma.ingredient.create({
      data: { name: 'Mussarela', inStock: true },
    });
    await prisma.item.create({
      data: {
        name: 'Calabresa',
        description: 'Pizza de calabresa',
        price: 60,
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
    authToken = loginResponse.body.accessToken as string;
  });

  afterEach(async () => {
    await app.close();
  });

  it('should close an order with payment, split the bill, reflect in the report, and list the waiter name', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: '12' })
      .expect(201);

    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });
    await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id, quantity: 2 })
      .expect(201);

    // The kitchen must finish the pizzas before the manager can close.
    const pizzaItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: created.body.id },
    });
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${created.body.id}/items/${pizzaItem.id}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${created.body.id}/items/${pizzaItem.id}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const closed = await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'CreditCard', splitInto: 3 })
      .expect(201);

    expect(closed.body.total).toBe(120);
    expect(closed.body.parts).toEqual([40, 40, 40]);
    expect(closed.body.paymentType).toBe('CreditCard');

    const report = await request(app.getHttpServer())
      .get('/reports/daily-earnings')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(report.body.grandTotal).toBe(120);
    expect(report.body.localTotal).toBe(120);

    const listing = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(listing.body).toHaveLength(1);
    expect(listing.body[0].waiterName).toBe('João Garçom');
    expect(listing.body[0].status).toBe('Closed');
    expect(listing.body[0].items[0].status).toBe('Ready');
  });

  it('should free the table after closing', async () => {
    const first = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: '10' })
      .expect(201);
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });
    await request(app.getHttpServer())
      .post(`/orders/${first.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(201);
    const pizzaItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: first.body.id },
    });
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${first.body.id}/items/${pizzaItem.id}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${first.body.id}/items/${pizzaItem.id}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${first.body.id}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'Cash' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: '10' })
      .expect(201);
  });

  it('should refuse closing an order while an item is still pending or in preparation', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: '9' })
      .expect(201);
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });
    await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(201);

    const whilePending = await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'Cash' })
      .expect(400);
    expect(whilePending.body.message).toBe(
      'Cannot close an order with items in preparation',
    );

    const pizzaItem = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: created.body.id },
    });
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${created.body.id}/items/${pizzaItem.id}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    const whilePreparing = await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'Cash' })
      .expect(400);
    expect(whilePreparing.body.message).toBe(
      'Cannot close an order with items in preparation',
    );

    await request(app.getHttpServer())
      .post(`/kitchen/orders/${created.body.id}/items/${pizzaItem.id}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'Cash' })
      .expect(201);
  });

  it('should refuse closing an empty order', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: '9' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'Cash' })
      .expect(400);

    expect(response.body.message).toBe('Order must have at least one item');
  });

  it('should list the day sales with waiter, payment, sale time and items, keeping incomplete and cancelled orders out', async () => {
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });

    const local = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: '12' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${local.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id, quantity: 2 })
      .expect(201);
    const localPizza = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: local.body.id },
    });
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${local.body.id}/items/${localPizza.id}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${local.body.id}/items/${localPizza.id}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${local.body.id}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'CreditCard' })
      .expect(201);

    const delivery = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: waiterId,
        type: 'Delivery',
        customerName: 'Maria Souza',
        address: 'Rua A',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${delivery.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(201);
    for (const status of ['Preparing', 'Out for delivery', 'Delivered']) {
      await request(app.getHttpServer())
        .patch(`/orders/${delivery.body.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status })
        .expect(200);
    }

    const open = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: '10' })
      .expect(201);
    const cancelled = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: waiterId, type: 'Local', tableId: '9' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${cancelled.body.id}/cancellation`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const sales = await request(app.getHttpServer())
      .get('/reports/daily-sales')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(sales.body).toHaveLength(2);

    expect(sales.body[0].type).toBe('Local');
    expect(sales.body[0].status).toBe('Closed');
    expect(sales.body[0].waiterName).toBe('João Garçom');
    expect(sales.body[0].paymentType).toBe('CreditCard');
    expect(sales.body[0].closedAt).toEqual(expect.any(String));
    expect(sales.body[0].deliveredAt).toBeNull();
    expect(sales.body[0].tableId).toBe('12');
    expect(sales.body[0].totalPrice).toBe(120);
    expect(sales.body[0].items).toEqual([
      {
        id: expect.any(String),
        itemId: calabresa.id,
        quantity: 2,
        status: 'Ready',
      },
    ]);

    expect(sales.body[1].type).toBe('Delivery');
    expect(sales.body[1].status).toBe('Delivered');
    expect(sales.body[1].waiterName).toBe('João Garçom');
    expect(sales.body[1].paymentType).toBeNull();
    expect(sales.body[1].closedAt).toBeNull();
    expect(sales.body[1].deliveredAt).toEqual(expect.any(String));
    expect(sales.body[1].totalPrice).toBe(60);
    expect(sales.body[1].items).toHaveLength(1);
    expect(sales.body[1].items[0].status).toBe('Pending');

    const saleIds = sales.body.map((sale: { id: string }) => sale.id);
    expect(saleIds).not.toContain(open.body.id);
    expect(saleIds).not.toContain(cancelled.body.id);
  });

  it('should refuse closing a delivery order', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: waiterId,
        type: 'Delivery',
        customerName: 'Maria Souza',
        address: 'Rua A',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'Cash' })
      .expect(400);

    expect(response.body.message).toBe('Only local orders can be closed');
  });
});
