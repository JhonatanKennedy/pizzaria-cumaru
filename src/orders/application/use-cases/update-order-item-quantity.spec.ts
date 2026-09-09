import { UpdateOrderItemQuantityUseCase } from './update-order-item-quantity.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';

const ORDER_ID = 'order-1';
const PIZZA_ITEM_ID = 'pizza-item-1';
const DRINK_ITEM_ID = 'drink-item-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeOpenOrderWithItems(): Order {
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
  order.addItem(
    OrderItems.create({
      id: DRINK_ITEM_ID,
      orderId: ORDER_ID,
      itemId: 'catalog-drink-1',
      unitPrice: 8,
      quantity: 2,
      requiresPreparation: false,
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

describe('UpdateOrderItemQuantityUseCase', () => {
  it('should raise the quantity of a drink to an absolute target', async () => {
    const order = makeOpenOrderWithItems();
    const repository = makeFakeRepository(order);
    const useCase = new UpdateOrderItemQuantityUseCase(repository);

    await useCase.execute({
      orderId: ORDER_ID,
      orderItemId: DRINK_ITEM_ID,
      quantity: 5,
    });

    const drink = order
      .getItems()
      .find((item) => item.getId() === DRINK_ITEM_ID);
    expect(drink?.getQuantity()).toBe(5);
    expect(repository.save).toHaveBeenCalledWith(order);
  });

  it('should lower the quantity of a pizza', async () => {
    const order = makeOpenOrderWithItems();
    const repository = makeFakeRepository(order);
    const useCase = new UpdateOrderItemQuantityUseCase(repository);

    await useCase.execute({
      orderId: ORDER_ID,
      orderItemId: PIZZA_ITEM_ID,
      quantity: 1,
    });

    const pizza = order
      .getItems()
      .find((item) => item.getId() === PIZZA_ITEM_ID);
    expect(pizza?.getQuantity()).toBe(1);
  });

  it('should adjust a pizza that is already in preparation', async () => {
    const order = makeOpenOrderWithItems();
    const pizza = order
      .getItems()
      .find((item) => item.getId() === PIZZA_ITEM_ID);
    pizza?.startPreparation();
    const repository = makeFakeRepository(order);
    const useCase = new UpdateOrderItemQuantityUseCase(repository);

    await useCase.execute({
      orderId: ORDER_ID,
      orderItemId: PIZZA_ITEM_ID,
      quantity: 2,
    });

    expect(pizza?.getQuantity()).toBe(2);
  });

  it('should not save when the target equals the current quantity', async () => {
    const order = makeOpenOrderWithItems();
    const repository = makeFakeRepository(order);
    const useCase = new UpdateOrderItemQuantityUseCase(repository);

    await useCase.execute({
      orderId: ORDER_ID,
      orderItemId: DRINK_ITEM_ID,
      quantity: 2,
    });

    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should refuse adjusting an item of a closed order', async () => {
    const order = makeOpenOrderWithItems();
    order.close(EPaymentType.CASH, CREATED_AT);
    const repository = makeFakeRepository(order);
    const useCase = new UpdateOrderItemQuantityUseCase(repository);

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        orderItemId: DRINK_ITEM_ID,
        quantity: 5,
      }),
    ).rejects.toThrow('Cannot change a closed order');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should refuse adjusting an item of a cancelled order', async () => {
    const order = makeOpenOrderWithItems();
    order.cancelOrder(CREATED_AT);
    const repository = makeFakeRepository(order);
    const useCase = new UpdateOrderItemQuantityUseCase(repository);

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        orderItemId: DRINK_ITEM_ID,
        quantity: 5,
      }),
    ).rejects.toThrow('Cannot change a cancelled order');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should throw when the order does not exist', async () => {
    const repository = makeFakeRepository(null);
    const useCase = new UpdateOrderItemQuantityUseCase(repository);

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        orderItemId: DRINK_ITEM_ID,
        quantity: 5,
      }),
    ).rejects.toThrow('Order not found');
  });

  it('should throw when the item is not in the order', async () => {
    const order = makeOpenOrderWithItems();
    const repository = makeFakeRepository(order);
    const useCase = new UpdateOrderItemQuantityUseCase(repository);

    await expect(
      useCase.execute({
        orderId: ORDER_ID,
        orderItemId: 'unknown-item',
        quantity: 5,
      }),
    ).rejects.toThrow('Item not found');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
