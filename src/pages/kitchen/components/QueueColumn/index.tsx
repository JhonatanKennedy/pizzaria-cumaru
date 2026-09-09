import type { TKitchenQueueOrder } from '../../api/kitchen.api';
import { ItemTile } from '../ItemTile';

interface QueueColumnProps {
  title: string;
  orders: TKitchenQueueOrder[];
  isBusy: (orderItemId: string) => boolean;
  onStart: (orderId: string, orderItemId: string) => void;
  onFinish: (orderId: string, orderItemId: string) => void;
  onCancel: (
    orderId: string,
    orderItemId: string,
    reason: string,
  ) => Promise<void>;
}

export function QueueColumn({
  title,
  orders,
  isBusy,
  onStart,
  onFinish,
  onCancel,
}: QueueColumnProps): React.ReactNode {
  // Flat stack in payload order: the server's arrival order is the display order.
  const tiles = orders.flatMap((order) =>
    order.items.map((item) => ({ orderId: order.orderId, item })),
  );

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-stone-900">{title}</h2>
      <div className="rounded-xl bg-white p-4 shadow-sm">
        {tiles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-stone-300 px-4 py-8 text-center text-sm text-stone-500">
            Nenhum item na fila
          </p>
        ) : (
          <ul className="space-y-3">
            {tiles.map(({ orderId, item }) => (
              <ItemTile
                key={item.orderItemId}
                orderId={orderId}
                item={item}
                isBusy={isBusy(item.orderItemId)}
                onStart={onStart}
                onFinish={onFinish}
                onCancel={onCancel}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
