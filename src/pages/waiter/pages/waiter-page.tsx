import { Link } from 'react-router';

export function WaiterPage(): React.ReactNode {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Painel do Garçom</h1>
      <p className="mt-1 text-stone-600">
        Registre pedidos de mesa e pedidos de entrega recebidos pelo WhatsApp.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/waiter/tables" className="card hover:border-red-300">
          <h2 className="font-semibold text-stone-900">Pedidos de mesa</h2>
          <p className="mt-1 text-sm text-stone-600">
            Abra e gerencie o pedido de cada mesa. Spec:
            features/03_table_order.feature
          </p>
        </Link>
        <Link to="/waiter/delivery" className="card hover:border-red-300">
          <h2 className="font-semibold text-stone-900">Pedidos de entrega</h2>
          <p className="mt-1 text-sm text-stone-600">
            Crie pedidos de entrega com nome e endereço do cliente. Spec:
            features/04_delivery_order.feature
          </p>
        </Link>
      </div>
    </div>
  );
}
