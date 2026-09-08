import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@components/Button';
import { formatBRL } from '@lib/format';
import { toErrorMessage } from '@lib/errors';
import { enrichOrder, type TEnrichedOrderItem } from '../business/enrich';
import { itemStatusLabel, orderStatusLabel } from '../business/labels';
import { AddItemPanel } from '../components/AddItemPanel';
import { CancelItemDialog } from '../components/CancelItemDialog';
import { useCancelItem } from '../hooks/use-cancel-item';
import { useMenu } from '../hooks/use-menu';
import { useOrders } from '../hooks/use-orders';

const OPEN_STATUS = 'Open';
const PENDING_STATUS = 'Pending';

export function OrderDetailPage(): React.ReactNode {
  const { orderId } = useParams();
  const ordersQuery = useOrders();
  const menuQuery = useMenu();
  const cancelItem = useCancelItem();
  const [itemToCancel, setItemToCancel] = useState<TEnrichedOrderItem | null>(
    null,
  );

  if (ordersQuery.isPending || menuQuery.isPending) {
    return <p className="text-stone-600">Carregando…</p>;
  }
  if (!ordersQuery.data || !menuQuery.data) {
    return (
      <p role="alert" className="text-red-700">
        {toErrorMessage(ordersQuery.error ?? menuQuery.error)}
      </p>
    );
  }

  const order = ordersQuery.data.find((entry) => entry.id === orderId);
  if (!order) {
    return <p className="text-stone-600">Pedido não encontrado.</p>;
  }

  const enriched = enrichOrder(order, menuQuery.data);
  const isOpen = enriched.status === OPEN_STATUS;

  const handleCancelConfirm = async (reason: string): Promise<void> => {
    if (!itemToCancel) {
      return;
    }
    await cancelItem.mutateAsync({
      orderId: enriched.id,
      orderItemId: itemToCancel.id,
      reason,
    });
    setItemToCancel(null);
  };

  return (
    <div>
      <Link
        to="/waiter/tables"
        className="text-sm text-stone-600 hover:text-stone-900"
      >
        ← Pedidos de mesa
      </Link>
      <div className="card mt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-stone-900">
            Mesa {enriched.tableId ?? '—'}
          </h1>
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
            {orderStatusLabel(enriched.status)}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {enriched.waiterName ?? '—'}
        </p>
        <p className="mt-2 font-semibold text-stone-900">
          Total: {formatBRL(enriched.totalPrice)}
        </p>
      </div>
      <div className="card mt-4">
        <h2 className="font-semibold text-stone-900">Itens do pedido</h2>
        <ul className="mt-3 space-y-2">
          {enriched.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-stone-100 px-3 py-2"
            >
              <span className="text-stone-800">
                {item.quantity}× {item.name}
              </span>
              {itemStatusLabel(item.status) && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                  {itemStatusLabel(item.status)}
                </span>
              )}
              {item.unitPrice !== null && (
                <span className="ml-auto text-sm text-stone-600">
                  {formatBRL(item.unitPrice * item.quantity)}
                </span>
              )}
              {isOpen && item.status === PENDING_STATUS && (
                <Button
                  onClick={() => setItemToCancel(item)}
                  className="px-3 py-1 text-sm"
                >
                  Cancelar
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
      {isOpen && (
        <div className="mt-4">
          <AddItemPanel orderId={enriched.id} items={menuQuery.data} />
        </div>
      )}
      {itemToCancel && (
        <CancelItemDialog
          itemName={itemToCancel.name}
          onConfirm={handleCancelConfirm}
          onClose={() => setItemToCancel(null)}
        />
      )}
    </div>
  );
}
