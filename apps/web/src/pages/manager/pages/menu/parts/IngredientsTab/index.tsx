import { useState } from 'react';
import type { TIngredient, TIngredientListing } from '@api/catalog.api';
import { toErrorMessage } from '@lib/errors';
import { formatCount } from '@lib/format';
import { matchesSearch } from '@lib/search';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { SearchField } from '@components/SearchField';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { IngredientFormDialog } from '../../../../components/IngredientFormDialog';
import { useDeleteIngredient } from '../../../../hooks/use-delete-ingredient';
import { useToggleIngredientStock } from '../../../../hooks/use-toggle-ingredient-stock';

interface IngredientsTabProps {
  ingredients: TIngredientListing;
}

type TOpenDialog =
  | { kind: 'none' }
  | { kind: 'rename'; ingredient: TIngredient }
  | { kind: 'delete'; ingredient: TIngredient };

const SEARCH_ID = 'menu-ingredient-search';
const COLUMN_COUNT = 3;

export function IngredientsTab({
  ingredients,
}: IngredientsTabProps): React.ReactNode {
  const [openDialog, setOpenDialog] = useState<TOpenDialog>({ kind: 'none' });
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyIngredientId, setBusyIngredientId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const toggleStockMutation = useToggleIngredientStock();
  const deleteIngredientMutation = useDeleteIngredient();

  const visibleIngredients = ingredients.filter((ingredient) =>
    matchesSearch(ingredient.name, query),
  );
  const searchQuery = query.trim();
  const emptyNotice =
    searchQuery === ''
      ? 'Nenhum ingrediente cadastrado. Use "Novo ingrediente" para cadastrar o primeiro.'
      : `Nenhum ingrediente para "${searchQuery}".`;

  const handleToggleStock = async (ingredient: TIngredient): Promise<void> => {
    setActionError(null);
    setBusyIngredientId(ingredient.id);
    try {
      await toggleStockMutation.mutateAsync({
        ingredientId: ingredient.id,
        available: !ingredient.available,
      });
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setBusyIngredientId(null);
    }
  };

  return (
    <div>
      <SearchField
        id={SEARCH_ID}
        label="Buscar ingrediente"
        placeholder="Buscar ingrediente"
        value={query}
        onChange={setQuery}
        className="w-full sm:w-64"
      />
      <p className="mt-3 text-sm text-stone-600">
        {formatCount(
          visibleIngredients.length,
          ingredients.length,
          'ingrediente',
          'ingredientes',
        )}
      </p>
      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {actionError}
        </p>
      )}
      <Card className="mt-2 overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-semibold tracking-wide text-stone-600 uppercase">
                <th scope="col" className="py-2.5 pr-4 pl-6">
                  Ingrediente
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
              {visibleIngredients.map((ingredient) => {
                const busy = busyIngredientId === ingredient.id;
                const stockLabel = ingredient.available
                  ? 'Marcar indisponível'
                  : 'Marcar disponível';

                return (
                  <tr key={ingredient.id} className="hover:bg-stone-100">
                    <th
                      scope="row"
                      className="py-3 pr-4 pl-6 font-medium text-stone-900"
                    >
                      {ingredient.name}
                    </th>
                    <td className="px-4 py-3">
                      {!ingredient.available && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs font-medium text-stone-700">
                          Indisponível
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-6 pl-4">
                      <div className="flex justify-end gap-2">
                        {/* Outlined, like every other repeated row action: a
                            solid brand fill per row is a wall of red that
                            drowns the data it sits beside. */}
                        <Button
                          variant="outline"
                          disabled={busy}
                          aria-label={`${stockLabel}: ${ingredient.name}`}
                          onClick={() => handleToggleStock(ingredient)}
                          className="px-3 py-1 text-sm"
                        >
                          {busy ? 'Atualizando…' : stockLabel}
                        </Button>
                        <Button
                          variant="outline"
                          aria-label={`Renomear ${ingredient.name}`}
                          onClick={() =>
                            setOpenDialog({ kind: 'rename', ingredient })
                          }
                          className="px-3 py-1 text-sm"
                        >
                          Renomear
                        </Button>
                        <Button
                          variant="secondary"
                          aria-label={`Excluir ${ingredient.name}`}
                          onClick={() =>
                            setOpenDialog({ kind: 'delete', ingredient })
                          }
                          className="px-3 py-1 text-sm"
                        >
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleIngredients.length === 0 && (
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
      {openDialog.kind === 'rename' && (
        <IngredientFormDialog
          ingredient={openDialog.ingredient}
          onClose={() => setOpenDialog({ kind: 'none' })}
        />
      )}
      {openDialog.kind === 'delete' && (
        <ConfirmDialog
          title="Excluir ingrediente"
          message={`"${openDialog.ingredient.name}" será removido da lista.`}
          confirmLabel="Excluir"
          onConfirm={() =>
            deleteIngredientMutation.mutateAsync(openDialog.ingredient.id)
          }
          onClose={() => setOpenDialog({ kind: 'none' })}
        />
      )}
    </div>
  );
}
