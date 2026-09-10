import { ListDaySalesUseCase } from './list-day-sales.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';

const CREATED_AT = new Date('2026-09-07T10:00:00Z');
const DAY = new Date('2026-09-07T09:00:00Z');

function makeFakeRepository(
  entries: Array<{ order: Order; waiterName: string | null }>,
) {
  return {
    findDaySales: vi.fn(async () => entries),
  } as unknown as IOrdersRepository;
}

function makeClosedLocal(): Order {
  return Order.restore({
    id: 'sale-local',
    userId: 1,
    type: EOrderType.LOCAL,
    paymentType: EPaymentType.PIX,
    status: EOrderStatus.CLOSED,
    createdAt: CREATED_AT,
    closedAt: new Date('2026-09-07T14:30:00Z'),
    tableId: '5',
    items: [],
    cancellationHistory: [],
  });
}

function makeDeliveredDelivery(): Order {
  const item = OrderItems.create({
    id: 'sale-item',
    orderId: 'sale-delivery',
    itemId: 'catalog-1',
    unitPrice: 45,
    quantity: 2,
    requiresPreparation: true,
    createdAt: CREATED_AT,
  });
  item.startPreparation();
  return Order.restore({
    id: 'sale-delivery',
    userId: 2,
    type: EOrderType.DELIVERY,
    status: EOrderStatus.DELIVERED,
    createdAt: CREATED_AT,
    deliveredAt: new Date('2026-09-07T19:00:00Z'),
    customerName: 'Maria Souza',
    address: 'Rua A',
    items: [item],
    cancellationHistory: [],
  });
}

describe('ListDaySalesUseCase', () => {
  it('should map the day sales with waiter, payment and sale time', async () => {
    const repository = makeFakeRepository([
      { order: makeClosedLocal(), waiterName: 'Ana Gerente' },
      { order: makeDeliveredDelivery(), waiterName: 'João Garçom' },
    ]);
    const useCase = new ListDaySalesUseCase(repository);

    const sales = await useCase.execute(DAY);

    expect(repository.findDaySales).toHaveBeenCalledWith(DAY);
    expect(sales).toHaveLength(2);

    const [local, delivery] = sales;
    expect(local.id).toBe('sale-local');
    expect(local.waiterName).toBe('Ana Gerente');
    expect(local.type).toBe('Local');
    expect(local.status).toBe('Closed');
    expect(local.paymentType).toBe('Pix');
    expect(local.tableId).toBe('5');
    expect(local.closedAt?.toISOString()).toBe('2026-09-07T14:30:00.000Z');
    expect(local.deliveredAt).toBeNull();

    expect(delivery.id).toBe('sale-delivery');
    expect(delivery.waiterName).toBe('João Garçom');
    expect(delivery.status).toBe('Delivered');
    expect(delivery.paymentType).toBeNull();
    expect(delivery.closedAt).toBeNull();
    expect(delivery.deliveredAt?.toISOString()).toBe(
      '2026-09-07T19:00:00.000Z',
    );
    expect(delivery.items).toEqual([
      {
        id: 'sale-item',
        itemId: 'catalog-1',
        quantity: 2,
        status: 'Preparing',
      },
    ]);
  });

  it('should return an empty list for a day with no sales', async () => {
    const repository = makeFakeRepository([]);
    const useCase = new ListDaySalesUseCase(repository);

    const sales = await useCase.execute(DAY);

    expect(sales).toEqual([]);
  });
});
