import { useState } from 'react';
import type { TTableListingEntry } from '@api/tables.api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { LoadingRegion } from '@components/LoadingRegion';
import { SearchField } from '@components/SearchField';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { formatBRL, formatCount } from '@lib/format';
import { matchesSearch } from '@lib/search';
import { useTables } from '../../hooks/use-tables';
import { tableLabel } from '../../business/labels';
import { RegisterTableDialog } from './parts/RegisterTableDialog';
import { RemoveTableDialog } from './parts/RemoveTableDialog';
import { RenameTableDialog } from './parts/RenameTableDialog';

type TOpenDialog =
  | { kind: 'none' }
  | { kind: 'register' }
  | { kind: 'rename'; table: TTableListingEntry }
  | { kind: 'remove'; table: TTableListingEntry };

const ROW_PLACEHOLDERS = [1, 2, 3, 4, 5] as const;
const SEARCH_ID = 'manager-table-search';
const COLUMN_COUNT = 4;

function sortByNumber(
  tables: readonly TTableListingEntry[],
): TTableListingEntry[] {
  return [...tables].sort((a, b) => a.number - b.number);
}

export function TablesPage(): React.ReactNode {
  const tablesQuery = useTables();
  const [openDialog, setOpenDialog] = useState<TOpenDialog>({ kind: 'none' });
  const [query, setQuery] = useState('');

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
    const searchQuery = query.trim();
    const visibleTables = tables.filter((table) =>
      matchesSearch(tableLabel(table), searchQuery),
    );
    const emptyNotice =
      searchQuery === ''
        ? 'Nenhuma mesa cadastrada.'
        : `Nenhuma mesa para "${searchQuery}".`;

    return (
      <div>
        <SearchField
          id={SEARCH_ID}
          label="Buscar mesa"
          placeholder="Buscar mesa"
          value={query}
          onChange={setQuery}
          className="w-full sm:w-64"
        />
        <p className="mt-3 text-sm text-stone-600">
          {formatCount(visibleTables.length, tables.length, 'mesa', 'mesas')}
        </p>
        <Card className="mt-2 overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left">
              <thead>
                <tr className="border-b border-stone-200 text-xs font-semibold tracking-wide text-stone-600 uppercase">
                  <th scope="col" className="py-2.5 pr-4 pl-6">
                    Mesa
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Situação
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Consumo
                  </th>
                  <th scope="col" className="py-2.5 pr-6 pl-4 text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibleTables.map((table) => (
                  <tr key={table.id} className="hover:bg-stone-100">
                    <th
                      scope="row"
                      className="py-3 pr-4 pl-6 font-medium text-stone-900"
                    >
                      {tableLabel(table)}
                    </th>
                    <td className="px-4 py-3">
                      {/* A pill marks the state worth noticing; a free table is
                          the resting state and needs no badge to say so. */}
                      {table.openOrder && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                          Ocupada
                        </span>
                      )}
                      {!table.openOrder && (
                        <span className="text-sm text-stone-600">Livre</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-stone-700">
                      {table.openOrder && formatBRL(table.openOrder.totalPrice)}
                    </td>
                    <td className="py-3 pr-6 pl-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          aria-label={`Renumerar ${tableLabel(table)}`}
                          onClick={() =>
                            setOpenDialog({ kind: 'rename', table })
                          }
                          className="px-3 py-1 text-sm"
                        >
                          Renumerar
                        </Button>
                        <Button
                          variant="secondary"
                          aria-label={`Remover ${tableLabel(table)}`}
                          onClick={() =>
                            setOpenDialog({ kind: 'remove', table })
                          }
                          className="px-3 py-1 text-sm"
                        >
                          Remover
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleTables.length === 0 && (
                  <tr>
                    <td
                      colSpan={COLUMN_COUNT}
                      className="px-6 py-10 text-center text-stone-600"
                    >
                      <span role="status">{emptyNotice}</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-4">
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
