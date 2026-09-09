import { useState } from 'react';
import type { TTableListingEntry } from '@api/tables.api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
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

function sortByNumber(
  tables: readonly TTableListingEntry[],
): TTableListingEntry[] {
  return [...tables].sort((a, b) => a.number - b.number);
}

export function TablesPage(): React.ReactNode {
  const tablesQuery = useTables();
  const [openDialog, setOpenDialog] = useState<TOpenDialog>({ kind: 'none' });

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

  const tables = sortByNumber(tablesQuery.data);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">Mesas</h1>
        <Button onClick={() => setOpenDialog({ kind: 'register' })}>
          Adicionar mesa
        </Button>
      </div>
      {tables.length === 0 ? (
        <p className="mt-6 text-stone-600">Nenhuma mesa cadastrada.</p>
      ) : (
        <Card className="mt-4">
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
                    onClick={() => setOpenDialog({ kind: 'rename', table })}
                    className="px-3 py-1 text-sm"
                  >
                    Renumerar
                  </Button>
                  <Button
                    onClick={() => setOpenDialog({ kind: 'remove', table })}
                    className="bg-stone-200 px-3 py-1 text-sm text-stone-800 hover:bg-stone-300"
                  >
                    Remover
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
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
