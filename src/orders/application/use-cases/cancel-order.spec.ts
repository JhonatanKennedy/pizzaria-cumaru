import { CancelOrderUseCase } from './cancel-order.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';

const ORDER_ID = 'order-1';
const PIZZA_ITEM_ID = 'pizza-item-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeOpenOrder(): Order {
  const order = Order.create({
    id: ORDER_ID,
    userId: 1,
    type: EOrderType.LOCAL,
    paymentType: EPaymentType.CASH,
    createdAt: CREATED_AT,
  });
  order.addItem(
    OrderItems.create({
      id: PIZZA_ITEM_ID,
      orderId: ORDER_ID,
      itemId: 'catalog-item-1',
      unitPrice: 45,
      quantity: 1,
      requiresPreparation: true,
      createdAt: CREATED_AT,
    }),
  );
  return order;
}

function makeFakeRepository(order: Order | null) {
  return {
    findById: vi.fn(async () => order),
    findAllOpen: vi.fn(async () => []),
    save: vi.fn(async () => undefined),
  } as unknown as IOrdersRepository;
}

describe('CancelOrderUseCase', () => {
  it('should cancel an open order, even one whose pizza is in preparation', async () => {
    const order = makeOpenOrder();
    order.getItems()[0].startPreparation();
    const repository = makeFakeRepository(order);
    const useCase = new CancelOrderUseCase(repository);

    await useCase.execute({ orderId: ORDER_ID });

    expect(order.getStatus()).toBe(EOrderStatus.CANCELLED);
    expect(order.getItems()).toHaveLength(0);
    expect(repository.save).toHaveBeenCalledWith(order);
  });

  it('should refuse cancelling a closed order', async () => {
    const order = makeOpenOrder();
    order.close(EPaymentType.CASH, CREATED_AT);
    const repository = makeFakeRepository(order);
    const useCase = new CancelOrderUseCase(repository);

    await expect(useCase.execute({ orderId: ORDER_ID })).rejects.toThrow(
      'Cannot change a closed order',
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw when the order does not exist', async () => {
    const repository = makeFakeRepository(null);
    const useCase = new CancelOrderUseCase(repository);

    await expect(useCase.execute({ orderId: ORDER_ID })).rejects.toThrow(
      'Order not found',
    );
  });
});
