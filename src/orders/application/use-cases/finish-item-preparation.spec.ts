import { FinishItemPreparationUseCase } from './finish-item-preparation.js';
import { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';
import { EOrderItemStatus } from '../../domain/enums/order-item-status.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';

const ORDER_ID = 'order-1';
const ITEM_ID = 'item-1';
const OTHER_ITEM_ID = 'item-2';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeOrderWithTwoItems(): Order {
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
  order.addItem(
    OrderItems.create({
      id: OTHER_ITEM_ID,
      orderId: ORDER_ID,
      itemId: 'catalog-item-2',
      unitPrice: 30,
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

describe('FinishItemPreparationUseCase', () => {
  it('should transition a Preparing item to Ready, keeping the order open and the other item untouched', async () => {
    const order = makeOrderWithTwoItems();
    order.getItems()[0].startPreparation();
    const repository = makeFakeRepository(order);
    const useCase = new FinishItemPreparationUseCase(repository);

    await useCase.execute({ orderId: ORDER_ID, itemId: ITEM_ID });

    expect(order.getItems()[0].getStatus()).toBe(EOrderItemStatus.READY);
    expect(order.getItems()[1].getStatus()).toBe(EOrderItemStatus.PENDING);
    expect(order.getStatus()).toBe(EOrderStatus.OPEN);
    expect(repository.save).toHaveBeenCalledWith(order);
  });

  it('should throw when the item is still Pending', async () => {
    const repository = makeFakeRepository(makeOrderWithTwoItems());
    const useCase = new FinishItemPreparationUseCase(repository);

    await expect(
      useCase.execute({ orderId: ORDER_ID, itemId: ITEM_ID }),
    ).rejects.toThrow('Item is not in preparation');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw when the order does not exist', async () => {
    const repository = makeFakeRepository(null);
    const useCase = new FinishItemPreparationUseCase(repository);

    await expect(
      useCase.execute({ orderId: ORDER_ID, itemId: ITEM_ID }),
    ).rejects.toThrow('Order not found');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
