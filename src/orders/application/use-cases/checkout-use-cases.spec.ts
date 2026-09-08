import { CloseOrderUseCase } from './close-order.js';
import { GetDailyEarningsReportUseCase } from './get-daily-earnings-report.js';
import { ListOrdersUseCase } from './list-orders.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';

const CREATED_AT = new Date('2026-09-07T12:00:00Z');
const DAY = new Date('2026-09-07T09:00:00Z');

function makeLocalOrder(id: string, withItem: boolean): Order {
  const order = Order.create({
    id,
    userId: 1,
    type: EOrderType.LOCAL,
    createdAt: CREATED_AT,
    tableId: '5',
  });
  if (withItem) {
    order.addItem(
      OrderItems.create({
        id: `${id}-item`,
        orderId: id,
        itemId: 'catalog-1',
        unitPrice: 60,
        quantity: 2,
        requiresPreparation: true,
        createdAt: CREATED_AT,
      }),
    );
  }
  return order;
}

function makeFakeRepository(
  order: Order | null,
  completed: Order[] = [],
  listing: Array<{ order: Order; waiterName: string | null }> = [],
) {
  return {
    findById: vi.fn(async () => order),
    findAllOpen: vi.fn(async () => []),
    findOpenByTableId: vi.fn(async () => null),
    findCompleted: vi.fn(async () => completed),
    findAllForListing: vi.fn(async () => listing),
    save: vi.fn(async () => undefined),
  } as unknown as IOrdersRepository;
}

describe('CloseOrderUseCase', () => {
  it('should close a local order with payment and report the total', async () => {
    const order = makeLocalOrder('order-1', true);
    const repository = makeFakeRepository(order);
    const useCase = new CloseOrderUseCase(repository);

    const result = await useCase.execute({
      orderId: 'order-1',
      paymentType: EPaymentType.CREDIT_CARD,
    });

    expect(order.getStatus()).toBe(EOrderStatus.CLOSED);
    expect(order.getPaymentType()).toBe(EPaymentType.CREDIT_CARD);
    expect(order.getClosedAt()).toBeInstanceOf(Date);
    expect(result.total).toBe(120);
    expect(result.parts).toBeUndefined();
    expect(repository.save).toHaveBeenCalledWith(order);
  });

  it('should split the bill into equal parts when requested', async () => {
    const order = makeLocalOrder('order-1', true);
    const repository = makeFakeRepository(order);
    const useCase = new CloseOrderUseCase(repository);

    const result = await useCase.execute({
      orderId: 'order-1',
      paymentType: EPaymentType.CASH,
      splitInto: 3,
    });

    expect(result.parts).toEqual([40, 40, 40]);
  });

  it('should refuse closing a delivery order', async () => {
    const delivery = Order.create({
      id: 'delivery-1',
      userId: 1,
      type: EOrderType.DELIVERY,
      createdAt: CREATED_AT,
      customerName: 'Maria Souza',
      address: 'Rua A',
    });
    const repository = makeFakeRepository(delivery);
    const useCase = new CloseOrderUseCase(repository);

    await expect(
      useCase.execute({
        orderId: 'delivery-1',
        paymentType: EPaymentType.CASH,
      }),
    ).rejects.toThrow('Only local orders can be closed');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should refuse closing an empty order', async () => {
    const repository = makeFakeRepository(makeLocalOrder('order-1', false));
    const useCase = new CloseOrderUseCase(repository);

    await expect(
      useCase.execute({ orderId: 'order-1', paymentType: EPaymentType.CASH }),
    ).rejects.toThrow('Order must have at least one item');
    expect(repository.save).not.toHaveBeenCalled();
  });
});

describe('GetDailyEarningsReportUseCase', () => {
  function makeCompletedLocal(total: number): Order {
    const order = Order.restore({
      id: `local-${total}`,
      userId: 1,
      type: EOrderType.LOCAL,
      createdAt: CREATED_AT,
      status: EOrderStatus.CLOSED,
      closedAt: CREATED_AT,
      items: [
        OrderItems.restore({
          id: `item-${total}`,
          orderId: `local-${total}`,
          itemId: 'catalog-1',
          unitPrice: total,
          quantity: 1,
          requiresPreparation: true,
          createdAt: CREATED_AT,
        }),
      ],
      cancellationHistory: [],
    });
    return order;
  }

  function makeDelivered(total: number): Order {
    return Order.restore({
      id: `delivery-${total}`,
      userId: 1,
      type: EOrderType.DELIVERY,
      createdAt: CREATED_AT,
      customerName: 'Maria Souza',
      address: 'Rua A',
      status: EOrderStatus.DELIVERED,
      deliveredAt: CREATED_AT,
      items: [
        OrderItems.restore({
          id: `item-${total}`,
          orderId: `delivery-${total}`,
          itemId: 'catalog-1',
          unitPrice: total,
          quantity: 1,
          requiresPreparation: true,
          createdAt: CREATED_AT,
        }),
      ],
      cancellationHistory: [],
    });
  }

  it('should report the three totals', async () => {
    const repository = makeFakeRepository(null, [
      makeCompletedLocal(480),
      makeDelivered(210),
    ]);
    const useCase = new GetDailyEarningsReportUseCase(repository);

    const report = await useCase.execute(DAY);

    expect(report).toEqual({
      grandTotal: 690,
      localTotal: 480,
      deliveryTotal: 210,
    });
  });

  it('should filter by type', async () => {
    const repository = makeFakeRepository(null, [
      makeCompletedLocal(480),
      makeDelivered(210),
    ]);
    const useCase = new GetDailyEarningsReportUseCase(repository);

    const local = await useCase.execute(DAY, EOrderType.LOCAL);
    const delivery = await useCase.execute(DAY, EOrderType.DELIVERY);

    expect(local).toEqual({
      grandTotal: 480,
      localTotal: 480,
      deliveryTotal: 0,
    });
    expect(delivery).toEqual({
      grandTotal: 210,
      localTotal: 0,
      deliveryTotal: 210,
    });
  });
});

describe('ListOrdersUseCase', () => {
  it('should list orders with the waiter name and item statuses', async () => {
    const order = makeLocalOrder('order-1', true);
    const repository = makeFakeRepository(
      null,
      [],
      [{ order, waiterName: 'João Garçom' }],
    );
    const useCase = new ListOrdersUseCase(repository);

    const listing = await useCase.execute(DAY);

    expect(listing).toHaveLength(1);
    expect(listing[0].id).toBe('order-1');
    expect(listing[0].waiterName).toBe('João Garçom');
    expect(listing[0].items[0].status).toBe('Pending');
    expect(listing[0].totalPrice).toBe(120);
  });

  it('should tolerate a missing waiter row', async () => {
    const order = makeLocalOrder('order-1', true);
    const repository = makeFakeRepository(
      null,
      [],
      [{ order, waiterName: null }],
    );
    const useCase = new ListOrdersUseCase(repository);

    const listing = await useCase.execute(DAY);

    expect(listing[0].waiterName).toBeNull();
  });
});
