import type { Order } from './entities/orders.js';
import { EOrderStatus } from './enums/order-status.js';
import { EOrderType } from './enums/order-type.js';
import { isInWindow } from './day-window.js';
import type { IDayWindow } from './day-window.js';

// A sale is a completed order: local orders are completed by the close,
// delivery orders by the delivery. Everything else — open, preparing, out
// for delivery, cancelled — is not a sale, whatever else it carries.
export const SALES_STATUSES_BY_TYPE: Readonly<
  Record<EOrderType, readonly EOrderStatus[]>
> = {
  [EOrderType.LOCAL]: [EOrderStatus.CLOSED],
  [EOrderType.DELIVERY]: [EOrderStatus.DELIVERED],
};

// The timestamp that dates a sale, per order type. Read here to pick the
// instant and by the orders adapter to bound the same column in its query.
export const SALES_INSTANT_FIELD_BY_TYPE: Readonly<
  Record<EOrderType, 'closedAt' | 'deliveredAt'>
> = {
  [EOrderType.LOCAL]: 'closedAt',
  [EOrderType.DELIVERY]: 'deliveredAt',
};

export function salesInstantOf(order: Order): Date | undefined {
  if (!SALES_STATUSES_BY_TYPE[order.getType()].includes(order.getStatus())) {
    return undefined;
  }
  const field = SALES_INSTANT_FIELD_BY_TYPE[order.getType()];
  return field === 'closedAt' ? order.getClosedAt() : order.getDeliveredAt();
}

export function isSaleOn(order: Order, window: IDayWindow): boolean {
  return isInWindow(salesInstantOf(order), window);
}
