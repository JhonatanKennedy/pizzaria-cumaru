import { ListDaySalesUseCase } from './list-day-sales.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';

// Local-time constructors throughout: the day window is a local calendar day,
// and these specs must pass in any timezone.
const DAY = new Date(2026, 8, 7, 9);
const TODAY = new Date(2026, 8, 7, 10);
const CLOSED_AT = new Date(2026, 8, 7, 14, 30);
const DELIVERED_AT = new Date(2026, 8, 7, 19);
const YESTERDAY = new Date(2026, 8, 6, 10);
const EARLIER_CLOSED_AT = new Date(2026, 8, 6, 14, 30);

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
    createdAt: TODAY,
    closedAt: CLOSED_AT,
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
    createdAt: TODAY,
  });
  item.startPreparation();
  return Order.restore({
    id: 'sale-delivery',
    userId: 2,
    type: EOrderType.DELIVERY,
    status: EOrderStatus.DELIVERED,
    createdAt: TODAY,
    deliveredAt: DELIVERED_AT,
    customerName: 'Maria Souza',
    address: 'Rua A',
    items: [item],
    cancellationHistory: [],
  });
}

function makeDelivery(status: EOrderStatus, deliveredAt?: Date): Order {
  return Order.restore({
    id: `sale-delivery-${status}`,
    userId: 2,
    type: EOrderType.DELIVERY,
    status,
    createdAt: TODAY,
    deliveredAt,
    customerName: 'Maria Souza',
    address: 'Rua A',
    items: [],
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
    expect(local.closedAt?.toISOString()).toBe(CLOSED_AT.toISOString());
    expect(local.deliveredAt).toBeNull();

    expect(delivery.id).toBe('sale-delivery');
    expect(delivery.waiterName).toBe('João Garçom');
    expect(delivery.status).toBe('Delivered');
    expect(delivery.paymentType).toBeNull();
    expect(delivery.closedAt).toBeNull();
    expect(delivery.deliveredAt?.toISOString()).toBe(DELIVERED_AT.toISOString());
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

  it("should include the day's closed locals and delivered deliveries", async () => {
    const repository = makeFakeRepository([
      { order: makeClosedLocal(), waiterName: 'Ana Gerente' },
      { order: makeDeliveredDelivery(), waiterName: 'João Garçom' },
    ]);
    const useCase = new ListDaySalesUseCase(repository);

    const sales = await useCase.execute(DAY);

    expect(sales.map((sale) => sale.id)).toEqual([
      'sale-local',
      'sale-delivery',
    ]);
  });

  it('should leave incomplete, cancelled and earlier-day orders out', async () => {
    const repository = makeFakeRepository([
      {
        order: makeDelivery(EOrderStatus.OPEN, DELIVERED_AT),
        waiterName: null,
      },
      {
        order: makeDelivery(EOrderStatus.PREPARING, DELIVERED_AT),
        waiterName: null,
      },
      {
        order: makeDelivery(EOrderStatus.OUT_FOR_DELIVERY, DELIVERED_AT),
        waiterName: null,
      },
      {
        order: makeDelivery(EOrderStatus.CANCELLED, DELIVERED_AT),
        waiterName: null,
      },
      {
        order: Order.restore({
          id: 'sale-earlier-day',
          userId: 1,
          type: EOrderType.LOCAL,
          status: EOrderStatus.CLOSED,
          createdAt: YESTERDAY,
          closedAt: EARLIER_CLOSED_AT,
          tableId: '5',
          items: [],
          cancellationHistory: [],
        }),
        waiterName: null,
      },
    ]);
    const useCase = new ListDaySalesUseCase(repository);

    const sales = await useCase.execute(DAY);

    expect(sales).toEqual([]);
  });
});
