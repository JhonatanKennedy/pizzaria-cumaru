import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@components/Button';
import { formatBRL } from '@lib/format';
import { toErrorMessage } from '@lib/errors';
import type { TPaymentType } from '@lib/payment-labels';
import { itemStatusLabel } from '@lib/item-labels';
import { enrichOrder, type TEnrichedOrderItem } from '@lib/order-enrich';
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

const OPEN_STATUS = 'Open';
const PENDING_STATUS = 'Pending';
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

  const handleCancelConfirm = async (reason: string): Promise<void> => {
    await cancelOrder.mutateAsync({ orderId: order.id, reason });
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

  const handleCancelItemConfirm = async (reason: string): Promise<void> => {
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
            Mesa {tableNumber}
          </h1>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
              {orderStatusLabel(enriched.status)}
            </span>
            {isOpen && canCloseOrder && (
              <Button
                onClick={() => setCloseRequested(true)}
                className="px-3 py-1 text-sm"
              >
                Fechar conta
              </Button>
            )}
            {isOpen && (
              <Button
                onClick={() => setCancelRequested(true)}
                className="bg-stone-200 px-3 py-1 text-sm text-stone-800 hover:bg-stone-300"
              >
                Cancelar pedido
              </Button>
            )}
          </div>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {enriched.waiterName ?? '—'}
        </p>
        <p className="mt-2 font-semibold text-stone-900">
          Total: {formatBRL(enriched.totalPrice)}
        </p>
      </div>
      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {actionError}
        </p>
      )}
      <div className="card mt-4">
        <h2 className="font-semibold text-stone-900">Itens do pedido</h2>
        {isCancelled && enriched.items.length === 0 && (
          <p className="mt-3 text-stone-600">Este pedido foi cancelado.</p>
        )}
        <ul className="mt-3 space-y-2">
          {enriched.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-stone-100 px-3 py-2"
            >
              {isOpen ? (
                <QuantityStepper
                  quantity={item.quantity}
                  busy={busyQuantityItemId === item.id}
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
              <span className="text-stone-800">{item.name}</span>
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
