import { ListOrdersUseCase } from './list-orders.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EOrderType } from '../../domain/enums/order-type.js';

const CREATED_AT = new Date('2026-09-07T10:00:00Z');
const DAY = new Date('2026-09-07T09:00:00Z');

function makeFakeRepository(
  entries: Array<{ order: Order; waiterName: string | null }>,
) {
  return {
    findAllForListing: vi.fn(async () => entries),
  } as unknown as IOrdersRepository;
}

function makeLocalOrder(): Order {
  return Order.restore({
    id: 'order-local',
    userId: 1,
    type: EOrderType.LOCAL,
    status: EOrderStatus.OPEN,
    createdAt: CREATED_AT,
    tableId: '5',
    items: [],
    cancellationHistory: [],
  });
}

function makeOpenDelivery(): Order {
  return Order.restore({
    id: 'order-delivery',
    userId: 1,
    type: EOrderType.DELIVERY,
    status: EOrderStatus.OPEN,
    createdAt: CREATED_AT,
    customerName: 'Maria Souza',
    phone: '(81) 99999-0000',
    address: 'Rua A',
    items: [],
    cancellationHistory: [],
  });
}

describe('ListOrdersUseCase', () => {
  it('should list the day orders with the waiter name', async () => {
    const repository = makeFakeRepository([
      { order: makeLocalOrder(), waiterName: 'João Garçom' },
      { order: makeOpenDelivery(), waiterName: 'Ana Gerente' },
    ]);
    const useCase = new ListOrdersUseCase(repository);

    const orders = await useCase.execute(DAY);

    expect(repository.findAllForListing).toHaveBeenCalledWith(DAY);
    expect(orders).toHaveLength(2);

    const [local, delivery] = orders;
    expect(local.id).toBe('order-local');
    expect(local.waiterName).toBe('João Garçom');
    expect(local.type).toBe('Local');
    expect(local.tableId).toBe('5');
    expect(local.customerName).toBeUndefined();
    expect(local.phone).toBeUndefined();
    expect(local.address).toBeUndefined();
    expect(local.deliveredAt).toBeUndefined();

    expect(delivery.id).toBe('order-delivery');
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
      createdAt: CREATED_AT,
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

  it('should return an empty list for a day with no orders', async () => {
    const repository = makeFakeRepository([]);
    const useCase = new ListOrdersUseCase(repository);

    const orders = await useCase.execute(DAY);

    expect(orders).toEqual([]);
  });
});
