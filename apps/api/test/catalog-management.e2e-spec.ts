import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const MANAGER_PASSWORD_HASH = bcrypt.hashSync('SenhaSegura123', 4);

describe('Catalog management (e2e)', () => {
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
    await prisma.table.deleteMany();
    await prisma.itemIngredient.deleteMany();
    await prisma.item.deleteMany();
    await prisma.ingredient.deleteMany();

    for (const tableId of ['3', '7', '5', '11']) {
      await prisma.table.create({
        data: { id: tableId, number: Number(tableId) },
      });
    }

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

  it('should mark an ingredient unavailable, hide dependent items, and restore them', async () => {
    const mussarela = await prisma.ingredient.findFirstOrThrow({
      where: { name: 'Mussarela' },
    });
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '3' })
      .expect(201);
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });
    await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/ingredients/${mussarela.id}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ available: false })
      .expect(200);

    const items = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(items.body[0].available).toBe(false);

    const hiddenQueue = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(hiddenQueue.body.local).toHaveLength(0);

    await request(app.getHttpServer())
      .patch(`/ingredients/${mussarela.id}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ available: true })
      .expect(200);

    const restoredQueue = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(restoredQueue.body.local).toHaveLength(1);
  });

  it('should update an item price through the item update and have new orders snapshot it', async () => {
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });

    await request(app.getHttpServer())
      .patch(`/items/${calabresa.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ price: 55 })
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '7' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(201);

    const stored = await prisma.orderItem.findFirstOrThrow();
    expect(stored.unitPrice).toBe(55);
  });

  it('should change everything in one request, keeping the category fixed at creation', async () => {
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });

    await request(app.getHttpServer())
      .patch(`/items/${calabresa.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Calabresa Premium',
        description: 'Calabresa com borda recheada',
        price: 48,
        requiresPreparation: false,
        ingredientIds: [],
        category: 'DRINK', // the update contract never accepts a category
      })
      .expect(200);

    const listing = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(listing.body).toEqual([
      expect.objectContaining({
        name: 'Calabresa Premium',
        description: 'Calabresa com borda recheada',
        price: 48,
        requiresPreparation: false,
        available: true,
        ingredientIds: [],
        category: 'PIZZA',
      }),
    ]);
  });

  it('should refuse a negative price with the domain message', async () => {
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });

    const response = await request(app.getHttpServer())
      .patch(`/items/${calabresa.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ price: -5 })
      .expect(400);

    expect(response.body.message).toBe('Price cannot be negative');

    const after = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(after.body[0].price).toBe(40);
  });

  it('should list ingredients with their availability', async () => {
    const mussarela = await prisma.ingredient.findFirstOrThrow({
      where: { name: 'Mussarela' },
    });
    await request(app.getHttpServer())
      .patch(`/ingredients/${mussarela.id}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ available: false })
      .expect(200);

    const listing = await request(app.getHttpServer())
      .get('/ingredients')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(listing.body).toEqual([
      expect.objectContaining({ name: 'Mussarela', available: false }),
    ]);
  });

  it('should create a pizza that appears in the menu with derived availability', async () => {
    const mussarela = await prisma.ingredient.findFirstOrThrow({
      where: { name: 'Mussarela' },
    });

    await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Calabresa Especial',
        description: 'Calabresa com catupiry',
        price: 55,
        category: 'PIZZA',
        requiresPreparation: true,
        ingredientIds: [mussarela.id],
      })
      .expect(201);

    const listing = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const created = listing.body.find(
      (entry: { name: string }) => entry.name === 'Calabresa Especial',
    );
    expect(created).toEqual(
      expect.objectContaining({
        name: 'Calabresa Especial',
        price: 55,
        category: 'PIZZA',
        requiresPreparation: true,
        available: true,
        ingredientIds: [mussarela.id],
      }),
    );

    await request(app.getHttpServer())
      .patch(`/ingredients/${mussarela.id}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ available: false })
      .expect(200);

    const hidden = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const unavailable = hidden.body.find(
      (entry: { name: string }) => entry.name === 'Calabresa Especial',
    );
    expect(unavailable.available).toBe(false);
  });

  it('should register an ingredient that appears in the listing, available', async () => {
    await request(app.getHttpServer())
      .post('/ingredients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Catupiry' })
      .expect(201);

    const listing = await request(app.getHttpServer())
      .get('/ingredients')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(listing.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Catupiry', available: true }),
      ]),
    );
  });

  it('should refuse duplicate item and ingredient names', async () => {
    const itemResponse = await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Calabresa',
        description: 'Outra calabresa',
        price: 45,
        category: 'PIZZA',
        requiresPreparation: true,
      })
      .expect(400);
    expect(itemResponse.body.message).toBe('Item name already in use');

    const ingredientResponse = await request(app.getHttpServer())
      .post('/ingredients')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Mussarela' })
      .expect(400);
    expect(ingredientResponse.body.message).toBe(
      'Ingredient name already in use',
    );
  });

  it('should rename an item in the menu listing and the kitchen queue', async () => {
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });

    await request(app.getHttpServer())
      .patch(`/items/${calabresa.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Calabresa Reforçada' })
      .expect(200);

    const listing = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const names = listing.body.map((entry: { name: string }) => entry.name);
    expect(names).toContain('Calabresa Reforçada');
    expect(names).not.toContain('Calabresa');

    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '5' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(201);

    const queue = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const queueNames = queue.body.local.flatMap(
      (order: { items: Array<{ name: string }> }) =>
        order.items.map((item) => item.name),
    );
    expect(queueNames).toContain('Calabresa Reforçada');
  });

  it('should replace ingredient links wholesale so the item follows their stock', async () => {
    const mussarela = await prisma.ingredient.findFirstOrThrow({
      where: { name: 'Mussarela' },
    });
    await request(app.getHttpServer())
      .post('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Parmegiana',
        description: 'Filé à parmegiana',
        price: 60,
        category: 'DISH',
        requiresPreparation: false,
      })
      .expect(201);
    const parmegiana = await prisma.item.findFirstOrThrow({
      where: { name: 'Parmegiana' },
    });

    const availabilityOf = async (): Promise<boolean> => {
      const listing = await request(app.getHttpServer())
        .get('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      return listing.body.find(
        (entry: { id: string }) => entry.id === parmegiana.id,
      ).available;
    };
    const ingredientIdsOf = async (): Promise<string[]> => {
      const listing = await request(app.getHttpServer())
        .get('/items')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      return listing.body.find(
        (entry: { id: string }) => entry.id === parmegiana.id,
      ).ingredientIds;
    };

    await request(app.getHttpServer())
      .patch(`/ingredients/${mussarela.id}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ available: false })
      .expect(200);
    expect(await availabilityOf()).toBe(true);
    expect(await ingredientIdsOf()).toEqual([]);

    await request(app.getHttpServer())
      .patch(`/items/${parmegiana.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ingredientIds: [mussarela.id] })
      .expect(200);
    expect(await availabilityOf()).toBe(false);
    expect(await ingredientIdsOf()).toEqual([mussarela.id]);

    await request(app.getHttpServer())
      .patch(`/ingredients/${mussarela.id}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ available: true })
      .expect(200);
    expect(await availabilityOf()).toBe(true);

    await request(app.getHttpServer())
      .patch(`/ingredients/${mussarela.id}/stock`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ available: false })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/items/${parmegiana.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ingredientIds: [] })
      .expect(200);
    expect(await availabilityOf()).toBe(true);
    expect(await ingredientIdsOf()).toEqual([]);

    const refused = await request(app.getHttpServer())
      .patch(`/items/${parmegiana.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ ingredientIds: ['unknown-ingredient'] })
      .expect(400);
    expect(refused.body.message).toBe('Ingredient not found');
  });

  it('should rename an ingredient without changing dependent availability', async () => {
    const mussarela = await prisma.ingredient.findFirstOrThrow({
      where: { name: 'Mussarela' },
    });

    await request(app.getHttpServer())
      .patch(`/ingredients/${mussarela.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Muçarela' })
      .expect(200);

    const listing = await request(app.getHttpServer())
      .get('/ingredients')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(listing.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Muçarela', available: true }),
      ]),
    );

    const items = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(
      items.body.find((entry: { name: string }) => entry.name === 'Calabresa')
        .available,
    ).toBe(true);
  });

  it('should remove an item from the menu and queue while open orders keep their lines', async () => {
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '11' })
      .expect(201);
    const orderId = created.body.id as string;
    await request(app.getHttpServer())
      .post(`/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(201);

    const before = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(before.body.local).toHaveLength(1);

    await request(app.getHttpServer())
      .delete(`/items/${calabresa.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const listing = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const names = listing.body.map((entry: { name: string }) => entry.name);
    expect(names).not.toContain('Calabresa');

    const after = await request(app.getHttpServer())
      .get('/kitchen/queue')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(after.body.local).toHaveLength(0);

    const refused = await request(app.getHttpServer())
      .post(`/orders/${orderId}/items`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ itemId: calabresa.id })
      .expect(400);
    expect(refused.body.message).toBe('Item not found');

    const stored = await prisma.order.findFirstOrThrow({
      where: { id: orderId },
    });
    expect(stored.status).toBe('Open');
    const storedItems = await prisma.orderItem.findMany({
      where: { orderId },
    });
    expect(storedItems).toHaveLength(1);
    expect(storedItems[0].itemId).toBe(calabresa.id);
  });

  it('should remove an ingredient from the listing and recompute dependent availability', async () => {
    const mussarela = await prisma.ingredient.findFirstOrThrow({
      where: { name: 'Mussarela' },
    });

    await request(app.getHttpServer())
      .delete(`/ingredients/${mussarela.id}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const listing = await request(app.getHttpServer())
      .get('/ingredients')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const ingredientNames = listing.body.map(
      (entry: { name: string }) => entry.name,
    );
    expect(ingredientNames).not.toContain('Mussarela');

    const links = await prisma.itemIngredient.findMany();
    expect(links).toHaveLength(0);

    const items = await request(app.getHttpServer())
      .get('/items')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    expect(
      items.body.find((entry: { name: string }) => entry.name === 'Calabresa')
        .available,
    ).toBe(true);
  });

  it('should refuse a Waiter on every catalog write route', async () => {
    const mussarela = await prisma.ingredient.findFirstOrThrow({
      where: { name: 'Mussarela' },
    });
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });
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
    const waiterToken = loginResponse.body.accessToken as string;

    const writeRoutes = [
      { method: 'post', path: '/items', body: { name: 'X', price: 1 } },
      { method: 'patch', path: `/items/${calabresa.id}`, body: { name: 'Y' } },
      { method: 'delete', path: `/items/${calabresa.id}` },
      { method: 'post', path: '/ingredients', body: { name: 'Z' } },
      {
        method: 'patch',
        path: `/ingredients/${mussarela.id}`,
        body: { name: 'W' },
      },
      { method: 'delete', path: `/ingredients/${mussarela.id}` },
    ] as const;

    const agent = request(app.getHttpServer());
    for (const route of writeRoutes) {
      const response = await agent[route.method](route.path)
        .set('Authorization', `Bearer ${waiterToken}`)
        .send('body' in route ? route.body : {})
        .expect(403);
      expect(response.body.message).toBe(
        'Access not authorized for your profile',
      );
    }
  });
});
