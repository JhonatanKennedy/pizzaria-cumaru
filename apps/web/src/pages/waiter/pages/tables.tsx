import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { TTableListingEntry } from '@api/tables.api';
import { LoadingRegion } from '@components/LoadingRegion';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { useAuth } from '@pages/auth/use-auth';
import { TableCard } from '../components/TableCard';
import { useCreateTableOrder } from '../hooks/use-create-table-order';
import { useTables } from '../hooks/use-tables';

// Two full rows on the widest grid — enough to fill the fold without the
// placeholder grid itself needing a scrollbar.
const TABLE_PLACEHOLDERS = [1, 2, 3, 4, 5, 6] as const;

export function TablesPage(): React.ReactNode {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tablesQuery = useTables();
  const createOrder = useCreateTableOrder();
  const [busyTableId, setBusyTableId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenTable = async (table: TTableListingEntry): Promise<void> => {
    if (!user) {
      return;
    }
    setActionError(null);
    setBusyTableId(table.id);
    try {
      const created = await createOrder.mutateAsync({
        userId: user.id,
        tableId: table.id,
      });
      navigate(`/waiter/orders/${created.id}`);
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setBusyTableId(null);
    }
  };

  const renderBody = (): React.ReactNode => {
    if (tablesQuery.isPending) {
      return (
        <LoadingRegion className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TABLE_PLACEHOLDERS.map((placeholder) => (
            <Skeleton key={placeholder} className="h-32 rounded-lg" />
          ))}
        </LoadingRegion>
      );
    }
    if (!tablesQuery.data) {
      return (
        <p role="alert" className="mt-4 text-red-700">
          {toErrorMessage(tablesQuery.error)}
        </p>
      );
    }
    if (tablesQuery.data.length === 0) {
      return <p className="mt-4 text-stone-600">Nenhuma mesa cadastrada.</p>;
    }
    return (
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tablesQuery.data.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            busy={busyTableId === table.id}
            onOpenTable={handleOpenTable}
          />
        ))}
      </div>
    );
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
      {renderBody()}
    </div>
  );
}
