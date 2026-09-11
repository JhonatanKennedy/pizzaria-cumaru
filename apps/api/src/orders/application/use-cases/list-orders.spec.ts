import { ListOrdersUseCase } from './list-orders.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EOrderType } from '../../domain/enums/order-type.js';

// Local-time constructors throughout: the listing keys on a local calendar
// day, and these specs must pass in any timezone.
const DAY = new Date(2026, 8, 7, 9);
const TODAY = new Date(2026, 8, 7, 10);
const YESTERDAY = new Date(2026, 8, 6, 10);

function makeFakeRepository(
  entries: Array<{ order: Order; waiterName: string | null }>,
) {
  return {
    findAllForListing: vi.fn(async () => entries),
  } as unknown as IOrdersRepository;
}

function makeLocal(status: EOrderStatus, createdAt: Date): Order {
  return Order.restore({
    id: `order-local-${status}`,
    userId: 1,
    type: EOrderType.LOCAL,
    status,
    createdAt,
    tableId: '5',
    items: [],
    cancellationHistory: [],
  });
}

function makeDelivery(status: EOrderStatus, createdAt: Date): Order {
  return Order.restore({
    id: `order-delivery-${status}`,
    userId: 1,
    type: EOrderType.DELIVERY,
    status,
    createdAt,
    customerName: 'Maria Souza',
    phone: '(81) 99999-0000',
    address: 'Rua A',
    items: [],
    cancellationHistory: [],
  });
}

function makeOrderWithItems(): Order {
  const order = Order.create({
    id: 'order-parts',
    userId: 1,
    type: EOrderType.LOCAL,
    createdAt: TODAY,
    tableId: '5',
  });
  order.addItem(
    OrderItems.create({
      id: 'item-pizza',
      orderId: 'order-parts',
      itemId: 'catalog-pizza-1',
      unitPrice: 46,
      quantity: 1,
      requiresPreparation: true,
      createdAt: TODAY,
      parts: [
        { name: 'Calabresa G', pieces: 4 },
        { name: 'Portuguesa G', pieces: 4 },
      ],
    }),
  );
  order.addItem(
    OrderItems.create({
      id: 'item-drink',
      orderId: 'order-parts',
      itemId: 'catalog-drink-1',
      unitPrice: 8,
      quantity: 2,
      requiresPreparation: false,
      createdAt: TODAY,
    }),
  );
  return order;
}

describe('ListOrdersUseCase', () => {
  it('should list the day orders with the waiter name', async () => {
    const repository = makeFakeRepository([
      { order: makeLocal(EOrderStatus.OPEN, TODAY), waiterName: 'João Garçom' },
      {
        order: makeDelivery(EOrderStatus.OPEN, TODAY),
        waiterName: 'Ana Gerente',
      },
    ]);
    const useCase = new ListOrdersUseCase(repository);

    const orders = await useCase.execute(DAY);

    expect(repository.findAllForListing).toHaveBeenCalledWith(DAY);
    expect(orders).toHaveLength(2);

    const [local, delivery] = orders;
    expect(local.id).toBe('order-local-Open');
    expect(local.waiterName).toBe('João Garçom');
    expect(local.type).toBe('Local');
    expect(local.tableId).toBe('5');
    expect(local.customerName).toBeUndefined();
    expect(local.phone).toBeUndefined();
    expect(local.address).toBeUndefined();
    expect(local.deliveredAt).toBeUndefined();

    expect(delivery.id).toBe('order-delivery-Open');
    expect(delivery.waiterName).toBe('Ana Gerente');
    expect(delivery.type).toBe('Delivery');
    expect(delivery.customerName).toBe('Maria Souza');
    expect(delivery.phone).toBe('(81) 99999-0000');
    expect(delivery.address).toBe('Rua A');
    expect(delivery.deliveredAt).toBeUndefined();
  });

  it('should carry the delivery time once the order is delivered', async () => {
    const delivered = Order.restore({
      id: 'order-delivered',
      userId: 1,
      type: EOrderType.DELIVERY,
      status: EOrderStatus.DELIVERED,
      createdAt: TODAY,
      deliveredAt: new Date('2026-09-07T19:00:00Z'),
      customerName: 'Maria Souza',
      address: 'Rua A',
      items: [],
      cancellationHistory: [],
    });
    const repository = makeFakeRepository([
      { order: delivered, waiterName: null },
    ]);
    const useCase = new ListOrdersUseCase(repository);

    const [order] = await useCase.execute(DAY);

    expect(order.deliveredAt?.toISOString()).toBe('2026-09-07T19:00:00.000Z');
  });

  it('should round-trip the recorded price and parts on each item', async () => {
    const repository = makeFakeRepository([
      { order: makeOrderWithItems(), waiterName: null },
    ]);
    const useCase = new ListOrdersUseCase(repository);

    const [order] = await useCase.execute(DAY);

    expect(order.items).toHaveLength(2);
    expect(order.items[0].unitPrice).toBe(46);
    expect(order.items[0].parts).toEqual([
      { name: 'Calabresa G', pieces: 4 },
      { name: 'Portuguesa G', pieces: 4 },
    ]);
    expect(order.items[1].unitPrice).toBe(8);
    expect(order.items[1].parts).toEqual([]);
  });

  it('should return an empty list for a day with no orders', async () => {
    const repository = makeFakeRepository([]);
    const useCase = new ListOrdersUseCase(repository);

    const orders = await useCase.execute(DAY);

    expect(orders).toEqual([]);
  });
});

describe('ListOrdersUseCase listing scope', () => {
  it('should keep a local order left open overnight', async () => {
    const repository = makeFakeRepository([
      { order: makeLocal(EOrderStatus.OPEN, YESTERDAY), waiterName: null },
    ]);
    const useCase = new ListOrdersUseCase(repository);

    const orders = await useCase.execute(DAY);

    expect(orders.map((order) => order.id)).toEqual(['order-local-Open']);
  });

  it('should keep a delivery still in its cycle from an earlier day', async () => {
    const statuses = [EOrderStatus.PREPARING, EOrderStatus.OUT_FOR_DELIVERY];

    for (const status of statuses) {
      const repository = makeFakeRepository([
        { order: makeDelivery(status, YESTERDAY), waiterName: null },
      ]);
      const useCase = new ListOrdersUseCase(repository);

      const orders = await useCase.execute(DAY);

      expect(orders.map((order) => order.id)).toEqual([
        `order-delivery-${status}`,
      ]);
    }
  });

  it("should leave an earlier day's completed orders out", async () => {
    const repository = makeFakeRepository([
      { order: makeLocal(EOrderStatus.CLOSED, YESTERDAY), waiterName: null },
      {
        order: makeDelivery(EOrderStatus.DELIVERED, YESTERDAY),
        waiterName: null,
      },
    ]);
    const useCase = new ListOrdersUseCase(repository);

    const orders = await useCase.execute(DAY);

    expect(orders).toEqual([]);
  });

  it("should list the day's own orders whatever their status", async () => {
    const repository = makeFakeRepository([
      { order: makeLocal(EOrderStatus.OPEN, TODAY), waiterName: null },
      { order: makeLocal(EOrderStatus.CLOSED, TODAY), waiterName: null },
      { order: makeLocal(EOrderStatus.CANCELLED, TODAY), waiterName: null },
      {
        order: makeDelivery(EOrderStatus.DELIVERED, TODAY),
        waiterName: null,
      },
    ]);
    const useCase = new ListOrdersUseCase(repository);

    const orders = await useCase.execute(DAY);

    expect(orders).toHaveLength(4);
  });
});
