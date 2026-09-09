import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { TTableListingEntry } from '@api/tables.api';
import { toErrorMessage } from '@lib/errors';
import { useAuth } from '@pages/auth/use-auth';
import { TableCard } from '../components/TableCard';
import { useCreateTableOrder } from '../hooks/use-create-table-order';
import { useTables } from '../hooks/use-tables';

export function TablesPage(): React.ReactNode {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tablesQuery = useTables();
  const createOrder = useCreateTableOrder();
  const [actionError, setActionError] = useState<string | null>(null);

  if (tablesQuery.isPending) {
    return <p className="text-stone-600">Carregando…</p>;
  }
  if (!tablesQuery.data) {
    return (
      <p role="alert" className="text-red-700">
        {toErrorMessage(tablesQuery.error)}
      </p>
    );
  }

  const handleOpenTable = async (table: TTableListingEntry): Promise<void> => {
    if (!user) {
      return;
    }
    try {
      const created = await createOrder.mutateAsync({
        userId: user.id,
        tableId: table.id,
      });
      navigate(`/waiter/orders/${created.id}`);
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Pedidos de mesa</h1>
      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {actionError}
        </p>
      )}
      {tablesQuery.data.length === 0 ? (
        <p className="mt-6 text-stone-600">Nenhuma mesa cadastrada.</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tablesQuery.data.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              onOpenTable={handleOpenTable}
            />
          ))}
        </div>
      )}
    </div>
  );
}
