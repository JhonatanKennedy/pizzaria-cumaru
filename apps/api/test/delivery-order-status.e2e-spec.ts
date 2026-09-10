import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import bcrypt from 'bcrypt';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

const MANAGER_PASSWORD_HASH = bcrypt.hashSync('SenhaSegura123', 4);

describe('Delivery order status (e2e)', () => {
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
    await prisma.table.create({ data: { id: '2', number: 2 } });
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

  it('should advance a delivery order through the cycle and record the delivery time', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: 1,
        type: 'Delivery',
        customerName: 'Maria Souza',
        address: 'Rua A',
        phone: '(81) 99999-0000',
      })
      .expect(201);

    const orderId = created.body.id as string;

    const listingAfterCreate = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const createdEntry = listingAfterCreate.body.find(
      (entry: { id: string }) => entry.id === orderId,
    );
    expect(createdEntry).toEqual(
      expect.objectContaining({
        customerName: 'Maria Souza',
        phone: '(81) 99999-0000',
        address: 'Rua A',
      }),
    );

    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Preparing' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Out for delivery' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Delivered' })
      .expect(200);

    const stored = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });
    expect(stored.status).toBe('Delivered');
    expect(stored.deliveredAt).toBeInstanceOf(Date);

    const listingAfterDelivery = await request(app.getHttpServer())
      .get('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const deliveredEntry = listingAfterDelivery.body.find(
      (entry: { id: string }) => entry.id === orderId,
    );
    expect(deliveredEntry.deliveredAt).toEqual(expect.any(String));
  });

  it('should refuse the delivery cycle for a local order', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ userId: 1, type: 'Local', tableId: '2' })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Preparing' })
      .expect(400);

    expect(response.body.message).toBe(
      'Only delivery orders can enter the delivery cycle',
    );
  });

  it('should refuse skipping a cycle step', async () => {
    const created = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        userId: 1,
        type: 'Delivery',
        customerName: 'Maria Souza',
        address: 'Rua A',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/orders/${created.body.id}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'Delivered' })
      .expect(400);

    expect(response.body.message).toBe('Invalid delivery status transition');
  });
});
