import { useState } from 'react';
import type { TTableListingEntry } from '@api/tables.api';
import { BackLink } from '@components/BackLink';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { LoadingRegion } from '@components/LoadingRegion';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { formatBRL } from '@lib/format';
import { useTables } from '../../hooks/use-tables';
import { RegisterTableDialog } from './parts/RegisterTableDialog';
import { RemoveTableDialog } from './parts/RemoveTableDialog';
import { RenameTableDialog } from './parts/RenameTableDialog';

type TOpenDialog =
  | { kind: 'none' }
  | { kind: 'register' }
  | { kind: 'rename'; table: TTableListingEntry }
  | { kind: 'remove'; table: TTableListingEntry };

const ROW_PLACEHOLDERS = [1, 2, 3, 4, 5] as const;

function sortByNumber(
  tables: readonly TTableListingEntry[],
): TTableListingEntry[] {
  return [...tables].sort((a, b) => a.number - b.number);
}

export function TablesPage(): React.ReactNode {
  const tablesQuery = useTables();
  const [openDialog, setOpenDialog] = useState<TOpenDialog>({ kind: 'none' });

  const renderBody = (): React.ReactNode => {
    if (tablesQuery.isPending) {
      return (
        <LoadingRegion>
          <Card>
            <div className="divide-y divide-stone-100">
              {ROW_PLACEHOLDERS.map((placeholder) => (
                <div key={placeholder} className="py-3">
                  <Skeleton className="h-5 w-24" />
                </div>
              ))}
            </div>
          </Card>
        </LoadingRegion>
      );
    }
    if (!tablesQuery.data) {
      return (
        <p role="alert" className="text-red-700">
          {toErrorMessage(tablesQuery.error)}
        </p>
      );
    }

    const tables = sortByNumber(tablesQuery.data);
    if (tables.length === 0) {
      return <p className="text-stone-600">Nenhuma mesa cadastrada.</p>;
    }

    return (
      <Card>
        <ul className="divide-y divide-stone-100">
          {tables.map((table) => (
            <li
              key={table.id}
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <span className="font-medium text-stone-900">
                Mesa {table.number}
              </span>
              {table.openOrder ? (
                <>
                  <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                    Ocupada
                  </span>
                  <span className="text-sm text-stone-600">
                    {formatBRL(table.openOrder.totalPrice)}
                  </span>
                </>
              ) : (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  Livre
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog({ kind: 'rename', table })}
                  className="px-3 py-1 text-sm"
                >
                  Renumerar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setOpenDialog({ kind: 'remove', table })}
                  className="px-3 py-1 text-sm"
                >
                  Remover
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <BackLink to="/manager" label="Painel do gerente" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Mesas</h1>
        <Button onClick={() => setOpenDialog({ kind: 'register' })}>
          Adicionar mesa
        </Button>
      </div>
      {renderBody()}
      {openDialog.kind === 'register' && (
        <RegisterTableDialog onClose={() => setOpenDialog({ kind: 'none' })} />
      )}
      {openDialog.kind === 'rename' && (
        <RenameTableDialog
          table={openDialog.table}
          onClose={() => setOpenDialog({ kind: 'none' })}
        />
      )}
      {openDialog.kind === 'remove' && (
        <RemoveTableDialog
          table={openDialog.table}
          onClose={() => setOpenDialog({ kind: 'none' })}
        />
      )}
    </div>
  );
}
