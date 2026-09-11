import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { TOrderListing } from '@api/orders.api';
import { BackLink } from '@components/BackLink';
import { Button } from '@components/Button';
import { LoadingRegion } from '@components/LoadingRegion';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { useAuth } from '@pages/auth/use-auth';
import { useOrders } from '../../hooks/use-orders';
import { CreateDeliveryOrderDialog } from './parts/CreateDeliveryOrderDialog';
import { DeliveryOrderCard } from './parts/DeliveryOrderCard';

const ORDER_PLACEHOLDERS = [1, 2, 3, 4] as const;

export function DeliveryPage(): React.ReactNode {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ordersQuery = useOrders();
  const [creating, setCreating] = useState(false);

  const renderBody = (): React.ReactNode => {
    if (ordersQuery.isPending) {
      return (
        <LoadingRegion className="space-y-3">
          {ORDER_PLACEHOLDERS.map((placeholder) => (
            <Skeleton key={placeholder} className="h-32 rounded-lg" />
          ))}
        </LoadingRegion>
      );
    }
    if (!ordersQuery.data) {
      return (
        <p role="alert" className="text-red-700">
          {toErrorMessage(ordersQuery.error)}
        </p>
      );
    }

    // GET /orders returns only today's orders, so filtering keeps the list
    // free of the tables and orders of the other types.
    const deliveryOrders: TOrderListing[] = ordersQuery.data.filter(
      (order) => order.type === 'Delivery',
    );

    if (deliveryOrders.length === 0) {
      return <p className="text-stone-600">Nenhum pedido de entrega hoje.</p>;
    }

    return (
      <ul className="space-y-3">
        {deliveryOrders.map((order) => (
          <li key={order.id}>
            <Link
              to={`/manager/delivery/${order.id}`}
              className="block rounded-lg transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-red-600/40 focus-visible:outline-none"
            >
              <DeliveryOrderCard order={order} />
            </Link>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="space-y-4">
      <BackLink to="/manager" label="Painel do gerente" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">
          Pedidos de entrega
        </h1>
        <Button onClick={() => setCreating(true)}>
          Novo pedido de entrega
        </Button>
      </div>
      {renderBody()}
      {creating && user && (
        <CreateDeliveryOrderDialog
          userId={user.id}
          onCreated={(orderId) => {
            setCreating(false);
            navigate(`/manager/delivery/${orderId}`);
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
