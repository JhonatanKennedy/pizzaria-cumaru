import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../../prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaOrdersRepository } from './prisma-orders-repository.js';
import { Order } from '../domain/entities/orders.js';
import { OrderItems } from '../domain/entities/order-items.js';
import { EOrderStatus } from '../domain/enums/order-status.js';
import { EOrderType } from '../domain/enums/order-type.js';
import { EPaymentType } from '../domain/enums/payment-type.js';

loadEnv({ path: '.env.local' });

const TEST_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_URL }),
  });
}

function makeOrder(id = 'order-1'): Order {
  return Order.create({
    id,
    userId: 1,
    type: EOrderType.LOCAL,
    paymentType: EPaymentType.CASH,
    createdAt: CREATED_AT,
  });
}

function makeItem(id = 'order-item-1', createdAt = CREATED_AT): OrderItems {
  return OrderItems.create({
    id,
    orderId: 'order-1',
    itemId: 'catalog-item-1',
    unitPrice: 45,
    quantity: 1,
    requiresPreparation: true,
    createdAt,
  });
}

describe('PrismaOrdersRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaOrdersRepository;

  beforeEach(async () => {
    prisma = makeClient();
    await prisma.orderItem.deleteMany();
    await prisma.orderCancellation.deleteMany();
    await prisma.order.deleteMany();
    await prisma.user.deleteMany();
    repository = new PrismaOrdersRepository(prisma as never);
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should round-trip an order with items and statuses', async () => {
    const order = makeOrder();
    const item = makeItem();
    order.addItem(item);
    item.startPreparation();
    await repository.save(order);

    const loaded = await repository.findById('order-1');

    expect(loaded).not.toBeNull();
    expect(loaded?.getStatus()).toBe(EOrderStatus.OPEN);
    expect(loaded?.getCreatedAt().getTime()).toBe(CREATED_AT.getTime());
    expect(loaded?.getItems()).toHaveLength(1);
    expect(loaded?.getItems()[0].getStatus()).toBe('Preparing');
  });

  it('should round-trip the cancellation history', async () => {
    const order = makeOrder();
    const item = makeItem();
    order.addItem(item);
    await repository.save(order);

    const cancelledAt = new Date('2026-09-07T12:30:00Z');
    order.cancelItem(item.getId(), 'Customer gave up', cancelledAt);
    await repository.save(order);

    const loaded = await repository.findById('order-1');

    expect(loaded?.getItems()).toHaveLength(0);
    expect(loaded?.getCancellationHistory()).toEqual([
      { itemId: item.getId(), reason: 'Customer gave up', cancelledAt },
    ]);
  });

  it('should persist the optional status of non-prepared items', async () => {
    const order = makeOrder();
    order.addItem(
      OrderItems.create({
        id: 'drink-1',
        orderId: 'order-1',
        itemId: 'catalog-drink-1',
        unitPrice: 8,
        quantity: 1,
        requiresPreparation: false,
        createdAt: CREATED_AT,
      }),
    );
    await repository.save(order);

    const loaded = await repository.findById('order-1');

    expect(loaded?.getItems()[0].getStatus()).toBeUndefined();
  });

  it('should include in-cycle delivery orders in findAllOpen', async () => {
    await prisma.order.create({
      data: {
        id: 'delivering',
        userId: 1,
        type: 'Delivery',
        status: 'Out for delivery',
        customerName: 'Maria Souza',
        address: 'Rua A',
        createdAt: CREATED_AT,
        items: {
          create: [
            {
              id: 'delivering-item',
              itemId: 'catalog-item-1',
              unitPrice: 45,
              quantity: 1,
              status: 'Pending',
              requiresPreparation: true,
              createdAt: CREATED_AT,
            },
          ],
        },
      },
    });

    const openOrders = await repository.findAllOpen();

    expect(openOrders.map((order) => order.getId())).toContain('delivering');
    expect(
      openOrders.find((order) => order.getId() === 'delivering')?.getStatus(),
    ).toBe('Out for delivery');
  });

  it('should return only open orders from findAllOpen', async () => {
    const openOrder = makeOrder('open-order');
    openOrder.addItem(makeItem('open-item'));
    await repository.save(openOrder);

    const closedOrder = makeOrder('closed-order');
    closedOrder.addItem(makeItem('closed-item'));
    closedOrder.close(EPaymentType.CASH, CREATED_AT);
    await repository.save(closedOrder);

    const openOrders = await repository.findAllOpen();

    expect(openOrders.map((order) => order.getId())).toEqual(['open-order']);
  });

  it('should find the open order of a table', async () => {
    await prisma.order.create({
      data: {
        id: 'table-order',
        userId: 1,
        type: 'Local',
        status: 'Open',
        tableId: '3',
        createdAt: CREATED_AT,
      },
    });

    const openOrder = await repository.findOpenByTableId('3');
    const none = await repository.findOpenByTableId('99');

    expect(openOrder?.getId()).toBe('table-order');
    expect(none).toBeNull();
  });

  it('should return null for an unknown id', async () => {
    const loaded = await repository.findById('unknown-order');

    expect(loaded).toBeNull();
  });

  it('should find orders completed within a day', async () => {
    const day = new Date('2026-09-07T09:00:00Z');
    const inDay = new Date('2026-09-07T14:00:00Z');
    const otherDay = new Date('2026-09-06T14:00:00Z');
    await prisma.order.create({
      data: {
        id: 'closed-today',
        userId: 1,
        type: 'Local',
        status: 'Closed',
        closedAt: inDay,
        createdAt: inDay,
      },
    });
    await prisma.order.create({
      data: {
        id: 'closed-yesterday',
        userId: 1,
        type: 'Local',
        status: 'Closed',
        closedAt: otherDay,
        createdAt: otherDay,
      },
    });
    await prisma.order.create({
      data: {
        id: 'delivered-today',
        userId: 1,
        type: 'Delivery',
        status: 'Delivered',
        customerName: 'Maria Souza',
        address: 'Rua A',
        deliveredAt: inDay,
        createdAt: inDay,
      },
    });

    const completed = await repository.findCompleted(day);

    expect(completed.map((order) => order.getId()).sort()).toEqual([
      'closed-today',
      'delivered-today',
    ]);
  });

  it("should list the day's orders with the waiter name", async () => {
    const day = new Date('2026-09-07T09:00:00Z');
    const inDay = new Date('2026-09-07T14:00:00Z');
    const user = await prisma.user.create({
      data: {
        email: 'waiter@example.com',
        name: 'João Garçom',
        role: 'Waiter',
        passwordHash: 'hashed',
      },
    });
    await prisma.order.create({
      data: {
        id: 'listed-order',
        userId: user.id,
        type: 'Local',
        status: 'Open',
        createdAt: inDay,
      },
    });

    const listing = await repository.findAllForListing(day);

    expect(listing).toHaveLength(1);
    expect(listing[0].order.getId()).toBe('listed-order');
    expect(listing[0].waiterName).toBe('João Garçom');
  });

  it('should return a null waiter name when the user row is missing', async () => {
    const day = new Date('2026-09-07T09:00:00Z');
    await prisma.order.create({
      data: {
        id: 'orphan-order',
        userId: 999,
        type: 'Local',
        status: 'Open',
        createdAt: new Date('2026-09-07T14:00:00Z'),
      },
    });

    const listing = await repository.findAllForListing(day);

    expect(listing[0].waiterName).toBeNull();
  });
});
