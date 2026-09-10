import { Link } from 'react-router';

export function ManagerPage(): React.ReactNode {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Painel do Gerente</h1>
      <p className="mt-1 text-stone-600">
        Acesso total ao sistema: cardápio, estoque, pedidos e relatórios.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/manager/menu" className="card hover:border-red-300">
          <h2 className="font-semibold text-stone-900">Cardápio e estoque</h2>
          <p className="mt-1 text-sm text-stone-600">
            Gerencie os itens do cardápio e o estoque de ingredientes. Spec:
            features/02_menu_and_stock.feature
          </p>
        </Link>
        <Link
          to="/reports/daily-earnings"
          className="card hover:border-red-300"
        >
          <h2 className="font-semibold text-stone-900">
            Relatório de Ganhos Diários
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Totais do dia e vendas concluídas, com filtros por tipo, pagamento e
            categoria. Spec: features/07_manager_profile.feature
          </p>
        </Link>
        <Link to="/manager/delivery" className="card hover:border-red-300">
          <h2 className="font-semibold text-stone-900">Pedidos de entrega</h2>
          <p className="mt-1 text-sm text-stone-600">
            Pedidos de entrega recebidos pelo WhatsApp. Spec:
            features/04_delivery_order.feature
          </p>
        </Link>
        <Link to="/manager/tables" className="card hover:border-red-300">
          <h2 className="font-semibold text-stone-900">Gerenciar mesas</h2>
          <p className="mt-1 text-sm text-stone-600">
            Cadastre, renumere e remova as mesas do salão. Spec:
            features/10_table_management.feature
          </p>
        </Link>
      </div>
    </div>
  );
}
