import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const MANAGER_PASSWORD_HASH = bcrypt.hashSync('SenhaSegura123', 4);

const LOCAL_ORDER_ID = 'order-local-1';
const PIZZA_ITEM_ID = 'order-item-pizza-1';
const SECOND_PIZZA_ITEM_ID = 'order-item-pizza-2';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

describe('Order status and kitchen queue (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authToken = '';
  let calabresaItemId = '';

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

    await prisma.table.create({ data: { id: '3', number: 3 } });

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
    calabresaItemId = calabresa.id;
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
              flavors: [],
              createdAt: CREATED_AT,
            },
            {
              id: 'order-item-drink-1',
              itemId: 'agua',
              unitPrice: 8,
              quantity: 1,
              status: null,
              requiresPreparation: false,
              flavors: [],
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
    authToken = loginResponse.body.accessToken as string;
  });

  afterEach(async () => {
    await app.close();
  });

  it('should start an item and show it with the Preparing badge in the kitchen queue', async () => {
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

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
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const response = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.local).toHaveLength(0);
  });

  it('should show identical dishes as distinct rows and prepare one without affecting the other', async () => {
    await prisma.orderItem.create({
      data: {
        id: SECOND_PIZZA_ITEM_ID,
        orderId: LOCAL_ORDER_ID,
        itemId: calabresaItemId,
        unitPrice: 45,
        quantity: 1,
        status: 'Pending',
        requiresPreparation: true,
        flavors: [],
        createdAt: new Date('2026-09-07T12:05:00Z'),
      },
    });

    const queue = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(queue.body.local[0].items).toHaveLength(2);
    expect(
      queue.body.local[0].items.map(
        (row: { orderItemId: string }) => row.orderItemId,
      ),
    ).toEqual([PIZZA_ITEM_ID, SECOND_PIZZA_ITEM_ID]);

    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const remaining = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(remaining.body.local[0].items).toHaveLength(1);
    expect(remaining.body.local[0].items[0].orderItemId).toBe(
      SECOND_PIZZA_ITEM_ID,
    );
    expect(remaining.body.local[0].items[0].status).toBe('Pending');
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

  it('should cancel a pending item, recording the cancellation', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/cancellation`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
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
    expect(order?.cancellations[0].itemId).toBe(PIZZA_ITEM_ID);
    expect(order?.cancellations[0].cancelledAt).toEqual(expect.any(Date));
  });

  it('should cancel a pending item even when the body is empty', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/cancellation`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(201);

    const order = await prisma.order.findUnique({
      where: { id: LOCAL_ORDER_ID },
      include: { items: true },
    });
    expect(order?.items.map((item) => item.id)).toEqual(['order-item-drink-1']);
  });

  it('should return 400 with the domain message on an invalid transition', async () => {
    const response = await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.message).toBe('Item is not in preparation');
  });

  it('should refuse a Waiter starting an item preparation', async () => {
    await prisma.user.upsert({
      where: { email: 'joao.garcom' },
      update: { role: 'Waiter', passwordHash: MANAGER_PASSWORD_HASH },
      create: {
        email: 'joao.garcom',
        name: 'Joao Garcom',
        role: 'Waiter',
        passwordHash: MANAGER_PASSWORD_HASH,
      },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ login: 'joao.garcom', password: 'SenhaSegura123' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(403);

    expect(response.body.message).toBe(
      'Access not authorized for your profile',
    );
  });

  it('should return 400 with the domain message for a nonexistent order', async () => {
    const response = await request(app.getHttpServer())
      .post('/kitchen/orders/none/items/none/start')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.message).toBe('Order not found');
  });

  it('should let a Cook cancel one of two identical dishes, keeping the other Preparing', async () => {
    await prisma.orderItem.create({
      data: {
        id: SECOND_PIZZA_ITEM_ID,
        orderId: LOCAL_ORDER_ID,
        itemId: calabresaItemId,
        unitPrice: 45,
        quantity: 1,
        status: 'Pending',
        requiresPreparation: true,
        flavors: [],
        createdAt: new Date('2026-09-07T12:05:00Z'),
      },
    });
    await prisma.user.upsert({
      where: { email: 'carlos.cozinha' },
      update: { role: 'Cook', passwordHash: MANAGER_PASSWORD_HASH },
      create: {
        email: 'carlos.cozinha',
        name: 'Carlos Cozinha',
        role: 'Cook',
        passwordHash: MANAGER_PASSWORD_HASH,
      },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: 'SenhaSegura123' })
      .expect(201);
    const cookToken = loginResponse.body.accessToken as string;

    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(
        `/kitchen/orders/${LOCAL_ORDER_ID}/items/${SECOND_PIZZA_ITEM_ID}/start`,
      )
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/cancel`)
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(201);

    const queue = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(200);

    expect(queue.body.local[0].items).toHaveLength(1);
    expect(queue.body.local[0].items[0].orderItemId).toBe(SECOND_PIZZA_ITEM_ID);
    expect(queue.body.local[0].items[0].status).toBe('Preparing');

    const order = await prisma.order.findUnique({
      where: { id: LOCAL_ORDER_ID },
      include: { cancellations: true },
    });
    expect(order?.cancellations).toHaveLength(1);
    expect(order?.cancellations[0].itemId).toBe(PIZZA_ITEM_ID);
    expect(order?.cancellations[0].cancelledAt).toEqual(expect.any(Date));
    expect(order?.status).toBe('Open');
  });

  it('should refuse a Waiter cancelling an item in preparation from the kitchen', async () => {
    await prisma.user.upsert({
      where: { email: 'joao.garcom' },
      update: { role: 'Waiter', passwordHash: MANAGER_PASSWORD_HASH },
      create: {
        email: 'joao.garcom',
        name: 'Joao Garcom',
        role: 'Waiter',
        passwordHash: MANAGER_PASSWORD_HASH,
      },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'joao.garcom', password: 'SenhaSegura123' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/cancel`)
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(403);

    expect(response.body.message).toBe(
      'Access not authorized for your profile',
    );
  });

  it('should keep refusing the order-side cancellation of an item in preparation', async () => {
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/cancellation`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(response.body.message).toBe('Cannot cancel an item in preparation');
  });

  it('should cancel a whole order, drop it from the kitchen queue and free the table', async () => {
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/cancellation`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    const order = await prisma.order.findUnique({
      where: { id: LOCAL_ORDER_ID },
      include: { items: true },
    });
    expect(order?.status).toBe('Cancelled');
    expect(order?.cancelledAt).not.toBeNull();
    expect(order?.items).toHaveLength(0);

    const queue = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(queue.body.local).toHaveLength(0);

    const refusedAdd = await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresaItemId })
      .expect(400);
    expect(refusedAdd.body.message).toBe('Cannot change a cancelled order');

    await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '3' })
      .expect(201);
  });

  it('should cancel a whole order even when the body is empty', async () => {
    await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/cancellation`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({})
      .expect(201);

    const order = await prisma.order.findUnique({
      where: { id: LOCAL_ORDER_ID },
    });
    expect(order?.status).toBe('Cancelled');
  });

  it('should adjust quantities, including an item already in preparation', async () => {
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/quantity`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ quantity: 2 })
      .expect(200);

    const queue = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(queue.body.local[0].items[0].orderItemId).toBe(PIZZA_ITEM_ID);
    expect(queue.body.local[0].items[0].quantity).toBe(2);

    await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/order-item-drink-1/quantity`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ quantity: 5 })
      .expect(200);

    const lowered = await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/quantity`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ quantity: 1 })
      .expect(200);

    const drink = await prisma.orderItem.findUnique({
      where: { id: 'order-item-drink-1' },
    });
    expect(drink?.quantity).toBe(5);
    const pizza = await prisma.orderItem.findUnique({
      where: { id: PIZZA_ITEM_ID },
    });
    expect(pizza?.quantity).toBe(1);
    expect(lowered.status).toBe(200);
  });

  it('should refuse a quantity adjustment of a closed order', async () => {
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/start`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/kitchen/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/finish`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/close`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentType: 'Cash' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/quantity`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ quantity: 2 })
      .expect(400);

    expect(response.body.message).toBe('Cannot change a closed order');
  });

  it('should refuse a Cook cancelling an order or adjusting quantities', async () => {
    await prisma.user.upsert({
      where: { email: 'carlos.cozinha' },
      update: { role: 'Cook', passwordHash: MANAGER_PASSWORD_HASH },
      create: {
        email: 'carlos.cozinha',
        name: 'Carlos Cozinha',
        role: 'Cook',
        passwordHash: MANAGER_PASSWORD_HASH,
      },
    });
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'carlos.cozinha', password: 'SenhaSegura123' })
      .expect(201);
    const cookToken = loginResponse.body.accessToken as string;

    const cancellation = await request(app.getHttpServer())
      .post(`/orders/${LOCAL_ORDER_ID}/cancellation`)
      .set('Authorization', `Bearer ${cookToken}`)
      .expect(403);
    expect(cancellation.body.message).toBe(
      'Access not authorized for your profile',
    );

    const quantity = await request(app.getHttpServer())
      .patch(`/orders/${LOCAL_ORDER_ID}/items/${PIZZA_ITEM_ID}/quantity`)
      .set('Authorization', `Bearer ${cookToken}`)
      .send({ quantity: 2 })
      .expect(403);
    expect(quantity.body.message).toBe(
      'Access not authorized for your profile',
    );
  });
});
