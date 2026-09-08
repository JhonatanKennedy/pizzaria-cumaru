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

  it('should update an item price and have new orders snapshot it', async () => {
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });

    await request(app.getHttpServer())
      .patch(`/items/${calabresa.id}/price`)
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

  it('should refuse a negative price with the domain message', async () => {
    const calabresa = await prisma.item.findFirstOrThrow({
      where: { name: 'Calabresa' },
    });

    const response = await request(app.getHttpServer())
      .patch(`/items/${calabresa.id}/price`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ price: -5 })
      .expect(400);

    expect(response.body.message).toBe('Price cannot be negative');
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
});
