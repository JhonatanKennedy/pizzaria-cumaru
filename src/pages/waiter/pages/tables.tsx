import { toErrorMessage } from '@lib/errors';
import { enrichOrder } from '../business/enrich';
import { NewTableOrderForm } from '../components/NewTableOrderForm';
import { OrderCard } from '../components/OrderCard';
import { useMenu } from '../hooks/use-menu';
import { useOrders } from '../hooks/use-orders';

const OPEN_STATUS = 'Open';
const LOCAL_TYPE = 'LOCAL';

export function TablesPage(): React.ReactNode {
  const ordersQuery = useOrders();
  const menuQuery = useMenu();

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

  const openTables = ordersQuery.data
    .filter(
      (order) => order.type === LOCAL_TYPE && order.status === OPEN_STATUS,
    )
    .map((order) => enrichOrder(order, menuQuery.data));

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Pedidos de mesa</h1>
      <div className="card mt-6">
        <NewTableOrderForm />
      </div>
      {openTables.length === 0 ? (
        <p className="mt-6 text-stone-600">Nenhuma mesa aberta.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {openTables.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
