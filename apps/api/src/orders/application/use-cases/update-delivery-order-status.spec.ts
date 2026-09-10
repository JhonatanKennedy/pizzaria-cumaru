import { UpdateDeliveryOrderStatusUseCase } from './update-delivery-order-status.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';

const ORDER_ID = 'delivery-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeDeliveryOrder(): Order {
  return Order.create({
    id: ORDER_ID,
    userId: 1,
    type: EOrderType.DELIVERY,
    createdAt: CREATED_AT,
    customerName: 'Maria Souza',
    address: 'Rua A',
  });
}

function makeFakeRepository(order: Order | null) {
  return {
    findById: vi.fn(async () => order),
    findAllOpen: vi.fn(async () => []),
    findOpenByTableId: vi.fn(async () => null),
    save: vi.fn(async () => undefined),
  } as unknown as IOrdersRepository;
}

describe('UpdateDeliveryOrderStatusUseCase', () => {
  it('should advance a delivery order through the whole cycle', async () => {
    const order = makeDeliveryOrder();
    const repository = makeFakeRepository(order);
    const useCase = new UpdateDeliveryOrderStatusUseCase(repository);

    await useCase.execute({ orderId: ORDER_ID, status: 'Preparing' });
    expect(order.getStatus()).toBe(EOrderStatus.PREPARING);

    await useCase.execute({ orderId: ORDER_ID, status: 'Out for delivery' });
    expect(order.getStatus()).toBe(EOrderStatus.OUT_FOR_DELIVERY);

    await useCase.execute({ orderId: ORDER_ID, status: 'Delivered' });
    expect(order.getStatus()).toBe(EOrderStatus.DELIVERED);
    expect(order.getDeliveredAt()).toBeInstanceOf(Date);
    expect(repository.save).toHaveBeenCalledTimes(3);
  });

  it('should refuse the cycle for a local order', async () => {
    const local = Order.create({
      id: 'local-1',
      userId: 1,
      type: EOrderType.LOCAL,
      createdAt: CREATED_AT,
      tableId: '5',
    });
    const repository = makeFakeRepository(local);
    const useCase = new UpdateDeliveryOrderStatusUseCase(repository);

    await expect(
      useCase.execute({ orderId: 'local-1', status: 'Preparing' }),
    ).rejects.toThrow('Only delivery orders can enter the delivery cycle');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should propagate an invalid transition', async () => {
    const repository = makeFakeRepository(makeDeliveryOrder());
    const useCase = new UpdateDeliveryOrderStatusUseCase(repository);

    await expect(
      useCase.execute({ orderId: ORDER_ID, status: 'Delivered' }),
    ).rejects.toThrow('Invalid delivery status transition');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should refuse an unknown order', async () => {
    const repository = makeFakeRepository(null);
    const useCase = new UpdateDeliveryOrderStatusUseCase(repository);

    await expect(
      useCase.execute({ orderId: 'unknown', status: 'Preparing' }),
    ).rejects.toThrow('Order not found');
  });
});
