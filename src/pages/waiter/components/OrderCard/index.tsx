import { Link } from 'react-router';
import type { TEnrichedOrder } from '../../business/enrich';
import { itemStatusLabel, orderStatusLabel } from '../../business/labels';
import { formatBRL } from '@lib/format';

interface OrderCardProps {
  order: TEnrichedOrder;
}

export function OrderCard({ order }: OrderCardProps): React.ReactNode {
  return (
    <Link
      to={`/waiter/orders/${order.id}`}
      className="card block hover:border-red-300"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-stone-900">
          Mesa {order.tableId ?? '—'}
        </h2>
        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
          {orderStatusLabel(order.status)}
        </span>
      </div>
      <p className="mt-1 text-sm text-stone-600">{order.waiterName ?? '—'}</p>
      <ul className="mt-3 space-y-1">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <span className="text-stone-800">
              {item.quantity}× {item.name}
            </span>
            {itemStatusLabel(item.status) && (
              <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                {itemStatusLabel(item.status)}
              </span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 font-semibold text-stone-900">
        {formatBRL(order.totalPrice)}
      </p>
    </Link>
  );
}
