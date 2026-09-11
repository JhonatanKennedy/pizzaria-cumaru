import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BackLink } from '@components/BackLink';
import { Button } from '@components/Button';
import { formatBRL } from '@lib/format';
import { toErrorMessage } from '@lib/errors';
import type { TPaymentType } from '@lib/payment-labels';
import { itemStatusLabel } from '@lib/item-labels';
import { enrichOrder, type TEnrichedOrderItem } from '@lib/order-enrich';
import { formatComposition } from '@lib/flavor-composition';
import { orderStatusLabel } from '@lib/order-labels';
import { AddItemPanel } from '../components/AddItemPanel';
import { CancelItemDialog } from '../components/CancelItemDialog';
import { CancelOrderDialog } from '../components/CancelOrderDialog';
import { CloseOrderDialog } from '../components/CloseOrderDialog';
import { QuantityStepper } from '../components/QuantityStepper';
import { useCancelItem } from '../hooks/use-cancel-item';
import { useCancelOrder } from '../hooks/use-cancel-order';
import { useCloseOrder } from '../hooks/use-close-order';
import { useMenu } from '../hooks/use-menu';
import { useOrders } from '../hooks/use-orders';
import { useTables } from '../hooks/use-tables';
import { useUpdateItemQuantity } from '../hooks/use-update-item-quantity';
import { canCancelOrderItem } from '../business/can-cancel-order-item';
import { canIncreaseItemQuantity } from '../business/can-increase-item-quantity';
import { hasItemsInPreparation } from '../business/has-items-in-preparation';

const OPEN_STATUS = 'Open';
const CANCELLED_STATUS = 'Cancelled';

interface OrderDetailPageProps {
  // The order detail is shared by waiters and managers; closing a table
  // order is the manager's verb (routes/ decides, only routes/ reads auth).
  canCloseOrder?: boolean;
}

export function OrderDetailPage({
  canCloseOrder = false,
}: OrderDetailPageProps): React.ReactNode {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const ordersQuery = useOrders();
  const menuQuery = useMenu();
  const tablesQuery = useTables();
  const cancelItem = useCancelItem();
  const cancelOrder = useCancelOrder();
  const closeOrder = useCloseOrder();
  const updateItemQuantity = useUpdateItemQuantity();
  const [itemToCancel, setItemToCancel] = useState<TEnrichedOrderItem | null>(
    null,
  );
  const [cancelRequested, setCancelRequested] = useState(false);
  const [closeRequested, setCloseRequested] = useState(false);
  const [busyQuantityItemId, setBusyQuantityItemId] = useState<string | null>(
    null,
  );
  const [actionError, setActionError] = useState<string | null>(null);

  if (ordersQuery.isPending || menuQuery.isPending || tablesQuery.isPending) {
    return <p className="text-stone-600">Carregando…</p>;
  }
  if (!ordersQuery.data || !menuQuery.data || !tablesQuery.data) {
    return (
      <p role="alert" className="text-red-700">
        {toErrorMessage(
          ordersQuery.error ?? menuQuery.error ?? tablesQuery.error,
        )}
      </p>
    );
  }

  const order = ordersQuery.data.find((entry) => entry.id === orderId);
  if (!order) {
    return <p className="text-stone-600">Pedido não encontrado.</p>;
  }

  const enriched = enrichOrder(order, menuQuery.data);
  const tableNumber =
    tablesQuery.data.find((table) => table.id === enriched.tableId)?.number ??
    '—';
  const isOpen = enriched.status === OPEN_STATUS;
  const isCancelled = enriched.status === CANCELLED_STATUS;
  // The close gate mirrors the backend's guard: while any kitchen item is
  // still Pending or Preparing the manager cannot bill the table — the
  // disabled action and hint teach that before the dialog opens, and the
  // backend refusal stays the backstop for the state that goes stale.
  const blockedByKitchen = isOpen && hasItemsInPreparation(enriched.items);

  const handleCancelConfirm = async (): Promise<void> => {
    await cancelOrder.mutateAsync({ orderId: order.id });
    setCancelRequested(false);
    navigate('/waiter/tables');
  };

  const handleCloseConfirm = async (
    paymentType: TPaymentType,
  ): Promise<void> => {
    await closeOrder.mutateAsync({ orderId: order.id, paymentType });
    setCloseRequested(false);
    navigate('/waiter/tables');
  };

  const handleQuantityChange = async (
    itemId: string,
    quantity: number,
  ): Promise<void> => {
    setActionError(null);
    setBusyQuantityItemId(itemId);
    try {
      await updateItemQuantity.mutateAsync({
        orderId: order.id,
        orderItemId: itemId,
        quantity,
      });
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setBusyQuantityItemId(null);
    }
  };

  const handleCancelItemConfirm = async (): Promise<void> => {
    if (!itemToCancel) {
      return;
    }
    await cancelItem.mutateAsync({
      orderId: enriched.id,
      orderItemId: itemToCancel.id,
    });
    setItemToCancel(null);
  };

  return (
    <div className="space-y-4">
      <BackLink to="/waiter/tables" label="Pedidos de mesa" />
      <div className="card p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-stone-900">
            Mesa {tableNumber}
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
        {isOpen && (
          <div className="mt-4 space-y-2">
            {blockedByKitchen && (
              <p className="text-sm text-stone-600">
                Ainda há itens em preparação
              </p>
            )}
            <div className="flex flex-col gap-2 md:flex-row md:justify-end md:gap-3">
              {canCloseOrder && (
                <Button
                  onClick={() => setCloseRequested(true)}
                  disabled={blockedByKitchen}
                  className="w-full py-3 md:w-auto md:py-2"
                >
                  Fechar conta
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => setCancelRequested(true)}
                className="w-full py-3 md:w-auto md:py-2"
              >
                Cancelar pedido
              </Button>
            </div>
          </div>
        )}
      </div>
      {actionError && (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {actionError}
        </p>
      )}
      <div className="card p-4 md:p-6">
        <h2 className="font-semibold text-stone-900">Itens do pedido</h2>
        {isCancelled && enriched.items.length === 0 && (
          <p className="mt-3 text-stone-600">Este pedido foi cancelado.</p>
        )}
        <ul className="mt-3 space-y-3 md:space-y-2">
          {enriched.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 rounded-lg border border-stone-200 px-3 py-3 md:flex-row md:items-center md:gap-3 md:py-2"
            >
              <div className="flex min-w-0 flex-1 items-start gap-3 md:items-center">
                {isOpen ? (
                  <QuantityStepper
                    quantity={item.quantity}
                    busy={busyQuantityItemId === item.id}
                    canIncrease={canIncreaseItemQuantity(item.status)}
                    onDecrease={() =>
                      handleQuantityChange(item.id, item.quantity - 1)
                    }
                    onIncrease={() =>
                      handleQuantityChange(item.id, item.quantity + 1)
                    }
                  />
                ) : (
                  <span className="text-stone-800">{item.quantity}×</span>
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-stone-800">{item.name}</span>
                    {itemStatusLabel(item.status) && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                        {itemStatusLabel(item.status)}
                      </span>
                    )}
                  </span>
                  {item.parts.length > 1 && (
                    <span className="text-sm text-stone-600">
                      {formatComposition(item.parts)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <span className="text-sm text-stone-600">
                  {formatBRL(item.unitPrice * item.quantity)}
                </span>
                {isOpen && canCancelOrderItem(item.status) && (
                  <Button
                    variant="secondary"
                    onClick={() => setItemToCancel(item)}
                    className="px-3 py-1.5 text-sm"
                  >
                    Cancelar
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
      {isOpen && <AddItemPanel orderId={enriched.id} items={menuQuery.data} />}
      {itemToCancel && (
        <CancelItemDialog
          itemName={itemToCancel.name}
          onConfirm={handleCancelItemConfirm}
          onClose={() => setItemToCancel(null)}
        />
      )}
      {cancelRequested && (
        <CancelOrderDialog
          tableNumber={String(tableNumber)}
          onConfirm={handleCancelConfirm}
          onClose={() => setCancelRequested(false)}
        />
      )}
      {closeRequested && (
        <CloseOrderDialog
          tableNumber={String(tableNumber)}
          onConfirm={handleCloseConfirm}
          onClose={() => setCloseRequested(false)}
        />
      )}
    </div>
  );
}
