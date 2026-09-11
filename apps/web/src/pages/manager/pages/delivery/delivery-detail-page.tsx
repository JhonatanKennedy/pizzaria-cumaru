import { useState } from 'react';
import { useParams } from 'react-router';
import { BackLink } from '@components/BackLink';
import { Button } from '@components/Button';
import { LoadingRegion } from '@components/LoadingRegion';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { formatBRL, formatTime } from '@lib/format';
import { itemStatusLabel } from '@lib/item-labels';
import { enrichOrder } from '@lib/order-enrich';
import { orderStatusLabel } from '@lib/order-labels';
import { formatComposition } from '@lib/flavor-composition';
import {
  DELIVERY_ACTION_LABELS,
  nextDeliveryStatus,
} from '../../business/delivery-status';
import { useAdvanceDeliveryStatus } from '../../hooks/use-advance-delivery-status';
import { useMenu } from '../../hooks/use-menu';
import { useOrders } from '../../hooks/use-orders';
import { AddItemsPanel } from './parts/AddItemsPanel';

const OPEN_STATUS = 'Open';

const ITEM_PLACEHOLDERS = [1, 2, 3] as const;

export function DeliveryDetailPage(): React.ReactNode {
  const { orderId } = useParams();
  const ordersQuery = useOrders();
  const menuQuery = useMenu();
  const advanceDelivery = useAdvanceDeliveryStatus();
  const [advancing, setAdvancing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (ordersQuery.isPending || menuQuery.isPending) {
    return (
      <div className="space-y-4">
        <BackLink to="/manager/delivery" label="Pedidos de entrega" />
        <LoadingRegion className="space-y-4">
          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-4 w-32" />
            <Skeleton className="mt-2 h-4 w-56" />
            <Skeleton className="mt-4 h-6 w-36" />
          </div>
          <div className="card">
            <Skeleton className="h-5 w-36" />
            <div className="mt-3 divide-y divide-stone-100">
              {ITEM_PLACEHOLDERS.map((placeholder) => (
                <div key={placeholder} className="py-2">
                  <Skeleton className="h-5 w-44" />
                </div>
              ))}
            </div>
          </div>
        </LoadingRegion>
      </div>
    );
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
  const nextStatus = nextDeliveryStatus(enriched.status);
  const isOpen = enriched.status === OPEN_STATUS;

  const handleAdvance = async (): Promise<void> => {
    if (!nextStatus) {
      return;
    }
    setActionError(null);
    setAdvancing(true);
    try {
      await advanceDelivery.mutateAsync({
        orderId: enriched.id,
        status: nextStatus,
      });
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div className="space-y-4">
      <BackLink to="/manager/delivery" label="Pedidos de entrega" />
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-stone-900">
            {enriched.customerName ?? 'Pedido de entrega'}
          </h1>
          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
            {orderStatusLabel(enriched.status)}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {enriched.phone !== undefined && enriched.phone.length > 0
            ? enriched.phone
            : '—'}
        </p>
        <p className="mt-1 text-sm text-stone-600">
          {enriched.address !== undefined && enriched.address.length > 0
            ? enriched.address
            : '—'}
        </p>
        {enriched.deliveredAt && (
          <p className="mt-1 text-sm text-stone-600">
            Entregue às {formatTime(enriched.deliveredAt)}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-bold text-stone-900">
            Total: {formatBRL(enriched.totalPrice)}
          </p>
          {nextStatus && (
            <Button onClick={() => void handleAdvance()} disabled={advancing}>
              {advancing ? 'Atualizando…' : DELIVERY_ACTION_LABELS[nextStatus]}
            </Button>
          )}
        </div>
        {actionError && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {actionError}
          </p>
        )}
      </div>
      <div className="card">
        <h2 className="font-semibold text-stone-900">Itens do pedido</h2>
        {enriched.items.length === 0 && (
          <p className="mt-3 text-sm text-stone-600">
            Nenhum item adicionado ainda.
          </p>
        )}
        <ul className="mt-3 divide-y divide-stone-100">
          {enriched.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-2">
                  <span className="font-medium text-stone-900">
                    {item.quantity}× {item.name}
                  </span>
                  {itemStatusLabel(item.status) && (
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 text-xs text-stone-600">
                      {itemStatusLabel(item.status)}
                    </span>
                  )}
                </span>
                {item.parts.length > 1 && (
                  <span className="text-stone-600">
                    {formatComposition(item.parts)}
                  </span>
                )}
              </div>
              <span className="ml-auto text-stone-600">
                {formatBRL(item.unitPrice * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      {isOpen && <AddItemsPanel orderId={enriched.id} items={menuQuery.data} />}
    </div>
  );
}
