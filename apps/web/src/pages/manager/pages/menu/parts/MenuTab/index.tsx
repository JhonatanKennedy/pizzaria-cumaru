import { useState } from 'react';
import type {
  TIngredientListing,
  TMenuListing,
  TMenuItem,
} from '@api/catalog.api';
import {
  CATEGORY_ORDER,
  categoryLabel,
  filterCatalogItems,
} from '@lib/catalog';
import { formatBRL, formatCount } from '@lib/format';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { Chip } from '@components/Chip';
import { SearchField } from '@components/SearchField';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { ItemFormDialog } from '../../../../components/ItemFormDialog';
import { useDeleteItem } from '../../../../hooks/use-delete-item';

interface MenuTabProps {
  items: TMenuListing;
  ingredients: TIngredientListing;
}

type TOpenDialog =
  | { kind: 'none' }
  | { kind: 'edit'; item: TMenuItem }
  | { kind: 'delete'; item: TMenuItem };

const SEARCH_ID = 'menu-item-search';
const COLUMN_COUNT = 5;

export function MenuTab({ items, ingredients }: MenuTabProps): React.ReactNode {
  const [openDialog, setOpenDialog] = useState<TOpenDialog>({ kind: 'none' });
  // The listing is the full unpaginated catalog the other screens share, so
  // browsing and searching both stay client-side.
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const deleteItemMutation = useDeleteItem();

  const visibleItems = filterCatalogItems(items, { category, query });
  const searchQuery = query.trim();
  const scopeText = category === null ? '' : ` em ${categoryLabel(category)}`;
  const queryText = searchQuery === '' ? '' : ` para "${searchQuery}"`;
  const isUnfiltered = category === null && searchQuery === '';
  const emptyNotice = isUnfiltered
    ? 'Nenhum item no cardápio. Use "Novo item" para cadastrar o primeiro.'
    : `Nenhum item${scopeText}${queryText}.`;
  // The waiter types a name, not "a name within a category" — so the one thing
  // that empties the list for a reason the manager did not intend gets a way
  // out, right where the dead end is.
  const canClearCategory =
    visibleItems.length === 0 && category !== null && searchQuery !== '';

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          id={SEARCH_ID}
          label="Buscar item"
          placeholder="Buscar item"
          value={query}
          onChange={setQuery}
          className="w-full sm:w-64"
        />
        <div className="flex flex-wrap gap-2">
          <Chip selected={category === null} onClick={() => setCategory(null)}>
            Todas
          </Chip>
          {CATEGORY_ORDER.map((option) => (
            <Chip
              key={option}
              selected={category === option}
              onClick={() => setCategory(option)}
            >
              {categoryLabel(option)}
            </Chip>
          ))}
        </div>
      </div>
      <p className="mt-3 text-sm text-stone-600">
        {formatCount(visibleItems.length, items.length, 'item', 'itens')}
      </p>
      <Card className="mt-2 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-semibold tracking-wide text-stone-600 uppercase">
                <th scope="col" className="py-2.5 pr-4 pl-6">
                  Item
                </th>
                <th scope="col" className="px-4 py-2.5">
                  Categoria
                </th>
                <th scope="col" className="px-4 py-2.5 text-right">
                  Preço
                </th>
                <th scope="col" className="px-4 py-2.5">
                  Situação
                </th>
                <th scope="col" className="py-2.5 pr-6 pl-4 text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visibleItems.map((item) => (
                <tr key={item.id} className="hover:bg-stone-100">
                  <th
                    scope="row"
                    className="py-3 pr-4 pl-6 font-medium text-stone-900"
                  >
                    {item.name}
                  </th>
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {categoryLabel(item.category)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm tabular-nums text-stone-700">
                    {formatBRL(item.price)}
                  </td>
                  <td className="px-4 py-3">
                    {!item.available && (
                      <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                        Indisponível
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-6 pl-4">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        aria-label={`Editar ${item.name}`}
                        onClick={() => setOpenDialog({ kind: 'edit', item })}
                        className="px-3 py-1 text-sm"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label={`Excluir ${item.name}`}
                        onClick={() => setOpenDialog({ kind: 'delete', item })}
                        className="px-3 py-1 text-sm"
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {visibleItems.length === 0 && (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-6 py-10 text-center text-stone-600"
                  >
                    <span role="status">{emptyNotice}</span>
                    {canClearCategory && (
                      <div className="mt-3">
                        <Button
                          variant="outline"
                          className="px-3 py-1 text-sm"
                          onClick={() => setCategory(null)}
                        >
                          Buscar em todas as categorias
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
      {openDialog.kind === 'edit' && (
        <ItemFormDialog
          item={openDialog.item}
          ingredients={ingredients}
          onClose={() => setOpenDialog({ kind: 'none' })}
        />
      )}
      {openDialog.kind === 'delete' && (
        <ConfirmDialog
          title="Excluir item"
          message={`"${openDialog.item.name}" será removido do cardápio.`}
          confirmLabel="Excluir"
          onConfirm={() => deleteItemMutation.mutateAsync(openDialog.item.id)}
          onClose={() => setOpenDialog({ kind: 'none' })}
        />
      )}
    </div>
  );
}
