import { StartItemPreparationUseCase } from './start-item-preparation.js';
import { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';
import { EOrderItemStatus } from '../../domain/enums/order-item-status.js';

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

describe('StartItemPreparationUseCase', () => {
  it('should transition a Pending item to Preparing and persist the order', async () => {
    const order = makeOrderWithItem();
    const repository = makeFakeRepository(order);
    const useCase = new StartItemPreparationUseCase(repository);

    await useCase.execute({ orderId: ORDER_ID, itemId: ITEM_ID });

    expect(order.getItems()[0].getStatus()).toBe(EOrderItemStatus.PREPARING);
    expect(repository.save).toHaveBeenCalledWith(order);
  });

  it('should throw when the order does not exist', async () => {
    const repository = makeFakeRepository(null);
    const useCase = new StartItemPreparationUseCase(repository);

    await expect(
      useCase.execute({ orderId: ORDER_ID, itemId: ITEM_ID }),
    ).rejects.toThrow('Order not found');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw when the item is not in the order', async () => {
    const repository = makeFakeRepository(makeOrderWithItem());
    const useCase = new StartItemPreparationUseCase(repository);

    await expect(
      useCase.execute({ orderId: ORDER_ID, itemId: 'unknown-item' }),
    ).rejects.toThrow('Item not found');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should propagate the invalid-transition error', async () => {
    const order = makeOrderWithItem();
    order.getItems()[0].startPreparation();
    const repository = makeFakeRepository(order);
    const useCase = new StartItemPreparationUseCase(repository);

    await expect(
      useCase.execute({ orderId: ORDER_ID, itemId: ITEM_ID }),
    ).rejects.toThrow('Item is not waiting for preparation');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
