import { useState } from 'react';
import type { TIngredientListing, TIngredient } from '@api/catalog.api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { toErrorMessage } from '@lib/errors';
import { ConfirmDialog } from '../../../../components/ConfirmDialog';
import { IngredientFormDialog } from '../../../../components/IngredientFormDialog';
import { useDeleteIngredient } from '../../../../hooks/use-delete-ingredient';
import { useToggleIngredientStock } from '../../../../hooks/use-toggle-ingredient-stock';

interface IngredientsTabProps {
  ingredients: TIngredientListing;
}

type TOpenDialog =
  | { kind: 'none' }
  | { kind: 'create' }
  | { kind: 'rename'; ingredient: TIngredient }
  | { kind: 'delete'; ingredient: TIngredient };

export function IngredientsTab({
  ingredients,
}: IngredientsTabProps): React.ReactNode {
  const [openDialog, setOpenDialog] = useState<TOpenDialog>({ kind: 'none' });
  const [actionError, setActionError] = useState<string | null>(null);
  const toggleStockMutation = useToggleIngredientStock();
  const deleteIngredientMutation = useDeleteIngredient();

  const handleToggleStock = async (ingredient: TIngredient): Promise<void> => {
    try {
      await toggleStockMutation.mutateAsync({
        ingredientId: ingredient.id,
        available: !ingredient.available,
      });
    } catch (error) {
      setActionError(toErrorMessage(error));
    }
  };

  return (
    <div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => setOpenDialog({ kind: 'create' })}>
          Novo ingrediente
        </Button>
      </div>
      {actionError && (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {actionError}
        </p>
      )}
      <Card className="mt-4">
        <ul className="divide-y divide-stone-100">
          {ingredients.map((ingredient) => (
            <li
              key={ingredient.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span className="font-medium text-stone-900">
                {ingredient.name}
              </span>
              {!ingredient.available && (
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                  Indisponível
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <Button
                  onClick={() => handleToggleStock(ingredient)}
                  className="px-3 py-1 text-sm"
                >
                  {ingredient.available
                    ? 'Marcar indisponível'
                    : 'Marcar disponível'}
                </Button>
                <Button
                  onClick={() => setOpenDialog({ kind: 'rename', ingredient })}
                  className="px-3 py-1 text-sm"
                >
                  Renomear
                </Button>
                <Button
                  onClick={() => setOpenDialog({ kind: 'delete', ingredient })}
                  className="bg-stone-200 px-3 py-1 text-sm text-stone-800 hover:bg-stone-300"
                >
                  Excluir
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      {openDialog.kind === 'create' && (
        <IngredientFormDialog onClose={() => setOpenDialog({ kind: 'none' })} />
      )}
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
