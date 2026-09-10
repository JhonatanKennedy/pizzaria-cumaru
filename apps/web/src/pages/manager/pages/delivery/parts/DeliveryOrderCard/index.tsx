import type { TOrderListing } from '@api/orders.api';
import { formatBRL } from '@lib/format';
import { orderStatusLabel } from '@lib/order-labels';

interface DeliveryOrderCardProps {
  order: TOrderListing;
}

export function DeliveryOrderCard({
  order,
}: DeliveryOrderCardProps): React.ReactNode {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-stone-900">
          {order.customerName ?? '—'}
        </h3>
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
          {orderStatusLabel(order.status)}
        </span>
      </div>
      <p className="mt-1 text-sm text-stone-600">{order.phone ?? '—'}</p>
      <p className="mt-2 font-semibold text-stone-900">
        Total: {formatBRL(order.totalPrice)}
      </p>
    </div>
  );
}
