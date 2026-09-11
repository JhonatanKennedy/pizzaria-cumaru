import { isInProgress } from './order-progress.js';
import { Order } from './entities/orders.js';
import { EOrderStatus } from './enums/order-status.js';
import { EOrderType } from './enums/order-type.js';

const CREATED_AT = new Date('2026-09-07T10:00:00Z');
const LOCAL_TABLE_ID = '5';

function makeOrder(type: EOrderType, status: EOrderStatus): Order {
  return Order.restore({
    id: `order-${type}-${status}`,
    userId: 1,
    type,
    status,
    createdAt: CREATED_AT,
    tableId: type === EOrderType.LOCAL ? LOCAL_TABLE_ID : undefined,
    items: [],
    cancellationHistory: [],
  });
}

describe('isInProgress', () => {
  it('should count an open local order as in progress', () => {
    const order = makeOrder(EOrderType.LOCAL, EOrderStatus.OPEN);

    expect(isInProgress(order)).toBe(true);
  });

  it('should not count a closed or cancelled local order', () => {
    expect(isInProgress(makeOrder(EOrderType.LOCAL, EOrderStatus.CLOSED))).toBe(
      false,
    );
    expect(
      isInProgress(makeOrder(EOrderType.LOCAL, EOrderStatus.CANCELLED)),
    ).toBe(false);
  });

  it('should count a delivery order at each status of its cycle', () => {
    const cycle = [
      EOrderStatus.OPEN,
      EOrderStatus.PREPARING,
      EOrderStatus.OUT_FOR_DELIVERY,
    ];

    for (const status of cycle) {
      expect(isInProgress(makeOrder(EOrderType.DELIVERY, status))).toBe(true);
    }
  });

  it('should not count a delivered or cancelled delivery order', () => {
    expect(
      isInProgress(makeOrder(EOrderType.DELIVERY, EOrderStatus.DELIVERED)),
    ).toBe(false);
    expect(
      isInProgress(makeOrder(EOrderType.DELIVERY, EOrderStatus.CANCELLED)),
    ).toBe(false);
  });
});
