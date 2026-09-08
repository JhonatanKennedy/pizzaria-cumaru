import { CreateOrderUseCase } from './create-order.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';

const USER_ID = 1;
const TABLE_ID = '5';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeFakeRepository(openTableOrder: Order | null = null) {
  return {
    findById: vi.fn(async () => null),
    findAllOpen: vi.fn(async () => []),
    findOpenByTableId: vi.fn(async () => openTableOrder),
    save: vi.fn(async () => undefined),
  } as unknown as IOrdersRepository;
}

describe('CreateOrderUseCase', () => {
  it('should create a local order linked to the table and persist it', async () => {
    const repository = makeFakeRepository();
    const useCase = new CreateOrderUseCase(repository);

    const summary = await useCase.execute({
      userId: USER_ID,
      type: EOrderType.LOCAL,
      tableId: TABLE_ID,
    });

    expect(repository.findOpenByTableId).toHaveBeenCalledWith(TABLE_ID);
    expect(repository.save).toHaveBeenCalledTimes(1);
    const saved = vi.mocked(repository.save).mock.calls[0][0] as Order;
    expect(saved.getType()).toBe(EOrderType.LOCAL);
    expect(saved.getTableId()).toBe(TABLE_ID);
    expect(saved.getUserId()).toBe(USER_ID);
    expect(saved.getStatus()).toBe(EOrderStatus.OPEN);
    expect(summary.tableId).toBe(TABLE_ID);
    expect(summary.createdAt).toBeInstanceOf(Date);
    expect(summary.totalPrice).toBe(0);
  });

  it('should refuse a second open order for the same table', async () => {
    const occupied = Order.create({
      id: 'existing-order',
      userId: USER_ID,
      type: EOrderType.LOCAL,
      createdAt: CREATED_AT,
      tableId: TABLE_ID,
    });
    const repository = makeFakeRepository(occupied);
    const useCase = new CreateOrderUseCase(repository);

    await expect(
      useCase.execute({
        userId: USER_ID,
        type: EOrderType.LOCAL,
        tableId: TABLE_ID,
      }),
    ).rejects.toThrow('Table already has an open order');
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should refuse a local order without a table', async () => {
    const repository = makeFakeRepository();
    const useCase = new CreateOrderUseCase(repository);

    await expect(
      useCase.execute({ userId: USER_ID, type: EOrderType.LOCAL }),
    ).rejects.toThrow('Table is required for local orders');
  });

  it('should create a delivery order with its delivery data', async () => {
    const repository = makeFakeRepository();
    const useCase = new CreateOrderUseCase(repository);

    const summary = await useCase.execute({
      userId: USER_ID,
      type: EOrderType.DELIVERY,
      customerName: 'Maria Souza',
      phone: '(81) 99999-0000',
      address: 'Rua A',
    });

    expect(summary.type).toBe(EOrderType.DELIVERY);
    expect(summary.customerName).toBe('Maria Souza');
    expect(summary.phone).toBe('(81) 99999-0000');
    expect(summary.address).toBe('Rua A');
    expect(summary.tableId).toBeUndefined();
    expect(repository.findOpenByTableId).not.toHaveBeenCalled();
  });

  it('should refuse a delivery order without an address', async () => {
    const repository = makeFakeRepository();
    const useCase = new CreateOrderUseCase(repository);

    await expect(
      useCase.execute({
        userId: USER_ID,
        type: EOrderType.DELIVERY,
        customerName: 'Maria Souza',
      }),
    ).rejects.toThrow('Delivery address is required for delivery');
    expect(repository.save).not.toHaveBeenCalled();
  });
});
