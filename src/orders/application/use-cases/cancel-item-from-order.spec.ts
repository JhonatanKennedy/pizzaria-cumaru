import { CancelItemFromOrderUseCase } from './cancel-item-from-order.js';
import { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';

const ORDER_ID = 'order-1';
const ITEM_ID = 'item-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeOrderWithItem(): Order {
  const order = Order.create({
    id: ORDER_ID,
    userId: 1,
    type: EOrderType.LOCAL,
    paymentType: EPaymentType.CASH,
    createdAt: CREATED_AT,
  });
  order.addItem(
    OrderItems.create({
      id: ITEM_ID,
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

describe('CancelItemFromOrderUseCase', () => {
  it('should remove a Pending item and record the reason in the order history', async () => {
    const order = makeOrderWithItem();
    const repository = makeFakeRepository(order);
    const useCase = new CancelItemFromOrderUseCase(repository);

    await useCase.execute({
      orderId: ORDER_ID,
      itemId: ITEM_ID,
      reason: 'Customer gave up',
    });

    expect(order.getItems()).toHaveLength(0);
    expect(order.getCancellationHistory()).toHaveLength(1);
    expect(order.getCancellationHistory()[0].reason).toBe('Customer gave up');
    expect(repository.save).toHaveBeenCalledWith(order);
  });

  it('should refuse cancelling an item in preparation', async () => {
    const order = makeOrderWithItem();
    order.getItems()[0].startPreparation();
    const repository = makeFakeRepository(order);
    const useCase = new CancelItemFromOrderUseCase(repository);

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: ITEM_ID,
        reason: 'Customer gave up',
      }),
    ).rejects.toThrow('Cannot cancel an item in preparation');
    expect(order.getItems()).toHaveLength(1);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should refuse cancelling an item of a closed order', async () => {
    const order = makeOrderWithItem();
    order.close();
    const repository = makeFakeRepository(order);
    const useCase = new CancelItemFromOrderUseCase(repository);

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: ITEM_ID,
        reason: 'Customer gave up',
      }),
    ).rejects.toThrow('Cannot change a closed order');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw when the order does not exist', async () => {
    const repository = makeFakeRepository(null);
    const useCase = new CancelItemFromOrderUseCase(repository);

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        itemId: ITEM_ID,
        reason: 'Customer gave up',
      }),
    ).rejects.toThrow('Order not found');
  });
});
