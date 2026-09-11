import { useState } from 'react';
import type {
  TIngredientListing,
  TMenuListing,
  TMenuItem,
} from '@api/catalog.api';
import { CATEGORY_ORDER, categoryLabel } from '@lib/catalog';
import { formatBRL } from '@lib/format';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { ItemFormDialog } from '../../../../components/ItemFormDialog';
import { useDeleteItem } from '../../../../hooks/use-delete-item';

interface MenuTabProps {
  items: TMenuListing;
  ingredients: TIngredientListing;
}

type TOpenDialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'edit'; item: TMenuItem }
  | { kind: 'delete'; item: TMenuItem };

const CATEGORY_CHIPS: readonly (string | null)[] = [null, ...CATEGORY_ORDER];

export function MenuTab({ items, ingredients }: MenuTabProps): React.ReactNode {
  const [openDialog, setOpenDialog] = useState<TOpenDialog>({ kind: 'none' });
  // The listing is the full unpaginated catalog the other screens share, so
  // browsing by category stays client-side (null means Todas).
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const deleteItemMutation = useDeleteItem();
  const visibleItems =
    categoryFilter === null
      ? items
      : items.filter((item) => item.category === categoryFilter);

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_CHIPS.map((category) => (
            <button
              key={category ?? 'ALL'}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={
                categoryFilter === category
                  ? 'rounded-full bg-red-700 px-3 py-1 text-sm font-medium text-white'
                  : 'rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700'
              }
            >
              {category === null ? 'Todas' : categoryLabel(category)}
            </button>
          ))}
        </div>
        <Button onClick={() => setOpenDialog({ kind: 'create' })}>
          Novo item
        </Button>
      </div>
      <Card className="mt-4">
        <ul className="divide-y divide-stone-100">
          {visibleItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="font-medium text-stone-900">{item.name}</span>
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                {categoryLabel(item.category)}
              </span>
              <span className="text-sm text-stone-600">
                {formatBRL(item.price)}
              </span>
              {!item.available && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                  Indisponível
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOpenDialog({ kind: 'edit', item })}
                  className="px-3 py-1 text-sm"
                >
                  Editar
                </Button>
                <Button
                  onClick={() => setOpenDialog({ kind: 'delete', item })}
                  variant="secondary"
                  className="px-3 py-1 text-sm"
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {openDialog.kind === 'create' && (
        <ItemFormDialog
          ingredients={ingredients}
          onClose={() => setOpenDialog({ kind: 'none' })}
        />
      )}
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
