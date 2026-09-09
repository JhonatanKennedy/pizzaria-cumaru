import { useState } from 'react';
import type {
  TIngredient,
  TIngredientListing,
  TMenuItem,
} from '@api/catalog.api';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { toErrorMessage } from '@lib/errors';
import { useLinkIngredient } from '../../hooks/use-link-ingredient';
import { useUnlinkIngredient } from '../../hooks/use-unlink-ingredient';

interface ItemIngredientsDialogProps {
  item: TMenuItem;
  ingredients: TIngredientListing;
  onClose: () => void;
}

export function ItemIngredientsDialog({
  item,
  ingredients,
  onClose,
}: ItemIngredientsDialogProps): React.ReactNode {
  const linkIngredient = useLinkIngredient();
  const unlinkIngredient = useUnlinkIngredient();
  // Snapshot of the links while the dialog is open; rows below toggle it and
  // the menu cache refresh keeps the item rows in sync behind the dialog.
  const [linkedIds, setLinkedIds] = useState<Set<string>>(
    () => new Set(item.ingredientIds),
  );
  const [busyIngredientId, setBusyIngredientId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleToggle = async (ingredient: TIngredient): Promise<void> => {
    setActionError(null);
    setBusyIngredientId(ingredient.id);
    const isLinked = linkedIds.has(ingredient.id);
    try {
      if (isLinked) {
        await unlinkIngredient.mutateAsync({
          itemId: item.id,
          ingredientId: ingredient.id,
        });
        setLinkedIds((current) => {
          const next = new Set(current);
          next.delete(ingredient.id);
          return next;
        });
      } else {
        await linkIngredient.mutateAsync({
          itemId: item.id,
          ingredientId: ingredient.id,
        });
        setLinkedIds((current) => new Set(current).add(ingredient.id));
      }
    } catch (error) {
      setActionError(toErrorMessage(error));
    } finally {
      setBusyIngredientId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Ingredientes de ${item.name}`}
        >
          <h2 className="text-lg font-bold text-stone-900">
            Ingredientes de {item.name}
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Marque os ingredientes dos quais este item depende — quando um
            estiver indisponível, o item fica indisponível para pedidos.
          </p>
          {actionError && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {actionError}
            </p>
          )}
          <ul className="mt-4 max-h-72 space-y-2 overflow-y-auto">
            {ingredients.map((ingredient) => {
              const isLinked = linkedIds.has(ingredient.id);
              const busy = busyIngredientId === ingredient.id;
              return (
                <li
                  key={ingredient.id}
                  className="flex items-center gap-3 rounded-md border border-stone-100 px-3 py-2"
                >
                  <label className="flex items-center gap-2 text-sm text-stone-800">
                    <input
                      type="checkbox"
                      checked={isLinked}
                      disabled={busy}
                      onChange={() => void handleToggle(ingredient)}
                    />
                    {ingredient.name}
                  </label>
                  {!ingredient.available && (
                    <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500">
                      Indisponível
                    </span>
                  )}
                  {busy && <span className="text-xs text-stone-500">…</span>}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={onClose}
              className="bg-stone-200 text-stone-800 hover:bg-stone-300"
            >
              Fechar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
