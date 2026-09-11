import { isSaleOn, salesInstantOf } from './order-sales.js';
import { dayWindow } from './day-window.js';
import { Order } from './entities/orders.js';
import { EOrderStatus } from './enums/order-status.js';
import { EOrderType } from './enums/order-type.js';

// Local-time constructors throughout: the window is a local calendar day, and
// these specs must pass in any timezone.
const DAY = new Date(2026, 8, 7, 9);
const IN_DAY = new Date(2026, 8, 7, 14, 30);
const EARLIER_DAY = new Date(2026, 8, 6, 14, 30);
const WINDOW = dayWindow(DAY);

interface IOrderParams {
  status: EOrderStatus;
  type?: EOrderType;
  closedAt?: Date;
  deliveredAt?: Date;
}

// Both timestamps are settable on either type so a spec can prove the sale
// reads the column its type is dated by and ignores the other one.
function makeOrder({
  status,
  type = EOrderType.LOCAL,
  closedAt,
  deliveredAt,
}: IOrderParams): Order {
  return Order.restore({
    id: `order-${type}-${status}`,
    userId: 1,
    type,
    status,
    createdAt: EARLIER_DAY,
    tableId: type === EOrderType.LOCAL ? '5' : undefined,
    closedAt,
    deliveredAt,
    items: [],
    cancellationHistory: [],
  });
}

describe('isSaleOn', () => {
  it('should count a local order closed during the day', () => {
    const order = makeOrder({ status: EOrderStatus.CLOSED, closedAt: IN_DAY });

    expect(isSaleOn(order, WINDOW)).toBe(true);
  });

  it('should date a local sale by its close, not by a delivery time', () => {
    const order = makeOrder({
      status: EOrderStatus.CLOSED,
      closedAt: EARLIER_DAY,
      deliveredAt: IN_DAY,
    });

    expect(isSaleOn(order, WINDOW)).toBe(false);
  });

  it('should count a delivery order delivered during the day', () => {
    const order = makeOrder({
      type: EOrderType.DELIVERY,
      status: EOrderStatus.DELIVERED,
      deliveredAt: IN_DAY,
    });

    expect(isSaleOn(order, WINDOW)).toBe(true);
  });

  it('should date a delivery sale by its delivery, not by a close time', () => {
    const order = makeOrder({
      type: EOrderType.DELIVERY,
      status: EOrderStatus.DELIVERED,
      closedAt: IN_DAY,
      deliveredAt: EARLIER_DAY,
    });

    expect(isSaleOn(order, WINDOW)).toBe(false);
  });

  it('should never count a cancelled order', () => {
    const local = makeOrder({ status: EOrderStatus.CANCELLED, closedAt: IN_DAY });
    const delivery = makeOrder({
      type: EOrderType.DELIVERY,
      status: EOrderStatus.CANCELLED,
      deliveredAt: IN_DAY,
    });

    expect(isSaleOn(local, WINDOW)).toBe(false);
    expect(isSaleOn(delivery, WINDOW)).toBe(false);
  });

  it('should never count an order that is still in progress', () => {
    const statuses = [
      EOrderStatus.OPEN,
      EOrderStatus.PREPARING,
      EOrderStatus.OUT_FOR_DELIVERY,
    ];

    for (const status of statuses) {
      const order = makeOrder({
        type: EOrderType.DELIVERY,
        status,
        deliveredAt: IN_DAY,
      });
      expect(isSaleOn(order, WINDOW)).toBe(false);
    }
  });

  it('should never count a completed order that carries no sale instant', () => {
    const order = makeOrder({ status: EOrderStatus.CLOSED });

    expect(salesInstantOf(order)).toBeUndefined();
    expect(isSaleOn(order, WINDOW)).toBe(false);
  });

  it('should include the last instant of the day and exclude the next midnight', () => {
    const lastInstant = makeOrder({
      status: EOrderStatus.CLOSED,
      closedAt: new Date(2026, 8, 7, 23, 59, 59, 999),
    });
    const nextMidnight = makeOrder({
      status: EOrderStatus.CLOSED,
      closedAt: new Date(2026, 8, 8, 0, 0, 0, 0),
    });

    expect(isSaleOn(lastInstant, WINDOW)).toBe(true);
    expect(isSaleOn(nextMidnight, WINDOW)).toBe(false);
  });
});
