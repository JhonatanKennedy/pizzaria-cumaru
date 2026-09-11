import type { Order } from './entities/orders.js';
import { EOrderStatus } from './enums/order-status.js';
import { EOrderType } from './enums/order-type.js';

// The statuses that leave an order still being served, per order type: a
// local order is in progress for as long as it is open, while a delivery
// order walks its own cycle. A Record rather than a partial map, so an order
// type added without a decision here is a compile error.
export const IN_PROGRESS_STATUSES_BY_TYPE: Readonly<
  Record<EOrderType, readonly EOrderStatus[]>
> = {
  [EOrderType.LOCAL]: [EOrderStatus.OPEN],
  [EOrderType.DELIVERY]: [
    EOrderStatus.OPEN,
    EOrderStatus.PREPARING,
    EOrderStatus.OUT_FOR_DELIVERY,
  ],
};

export function isInProgress(order: Order): boolean {
  return IN_PROGRESS_STATUSES_BY_TYPE[order.getType()].includes(
    order.getStatus(),
  );
}
