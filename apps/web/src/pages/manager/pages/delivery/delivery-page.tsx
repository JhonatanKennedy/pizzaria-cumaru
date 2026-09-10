import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { TOrderListing } from '@api/orders.api';
import { Button } from '@components/Button';
import { toErrorMessage } from '@lib/errors';
import { useAuth } from '@pages/auth/use-auth';
import { useOrders } from '../../hooks/use-orders';
import { CreateDeliveryOrderDialog } from './parts/CreateDeliveryOrderDialog';
import { DeliveryOrderCard } from './parts/DeliveryOrderCard';

export function DeliveryPage(): React.ReactNode {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ordersQuery = useOrders();
  const [creating, setCreating] = useState(false);

  if (ordersQuery.isPending) {
    return <p className="text-stone-600">Carregando…</p>;
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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">
          Pedidos de entrega
        </h1>
        <Button onClick={() => setCreating(true)}>
          Novo pedido de entrega
        </Button>
      </div>
      {deliveryOrders.length === 0 ? (
        <p className="mt-8 text-stone-600">Nenhum pedido de entrega hoje.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {deliveryOrders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/manager/delivery/${order.id}`}
                className="block transition-opacity hover:opacity-80"
              >
                <DeliveryOrderCard order={order} />
              </Link>
            </li>
          ))}
        </ul>
      )}
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
