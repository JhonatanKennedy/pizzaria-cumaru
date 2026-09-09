import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { TIngredientListing, TMenuItem } from '@api/catalog.api';
import { CATEGORY_ORDER, categoryLabel } from '@lib/catalog';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';
import {
  isKitchenCategory,
  itemFormSchema,
  type TItemFormValues,
} from '../../business/schemas';
import { useCreateItem } from '../../hooks/use-create-item';
import { useUpdateItem } from '../../hooks/use-update-item';

interface ItemFormDialogProps {
  ingredients: TIngredientListing;
  onClose: () => void;
  // When provided the dialog edits that item — the same form used to
  // create, pre-filled and saving through one update PATCH.
  item?: TMenuItem;
}

const CREATE_DEFAULTS: TItemFormValues = {
  name: '',
  description: '',
  price: 0,
  category: 'PIZZA',
  requiresPreparation: false,
  ingredientIds: [],
};

export function ItemFormDialog({
  ingredients,
  onClose,
  item,
}: ItemFormDialogProps): React.ReactNode {
  const createItemMutation = useCreateItem();
  const updateItemMutation = useUpdateItem();
  const isEditing = item !== undefined;

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: isEditing
      ? {
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          requiresPreparation: item.requiresPreparation,
          ingredientIds: item.ingredientIds,
        }
      : CREATE_DEFAULTS,
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing) {
        await updateItemMutation.mutateAsync({
          itemId: item.id,
          // The category is fixed by the item being edited — the update
          // carries the editable fields only.
          payload: {
            name: values.name,
            description: values.description,
            price: values.price,
            requiresPreparation: values.requiresPreparation,
            ingredientIds: values.ingredientIds,
          },
        });
      } else {
        await createItemMutation.mutateAsync(values);
      }
      onClose();
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEditing ? 'Editar item' : 'Novo item'}
        >
          <h2 className="text-lg font-bold text-stone-900">
            {isEditing ? `Editar ${item.name}` : 'Novo item'}
          </h2>
          <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
            {errors.root && (
              <p
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
              >
                {errors.root.message}
              </p>
            )}
            <TextField
              id="item-name"
              label="Nome"
              error={errors.name?.message}
              {...register('name')}
            />
            <TextField
              id="item-description"
              label="Descrição"
              error={errors.description?.message}
              {...register('description')}
            />
            <TextField
              id="item-price"
              label="Preço"
              type="number"
              min={0}
              step="0.01"
              error={errors.price?.message}
              {...register('price', { valueAsNumber: true })}
            />
            <div>
              <label htmlFor="item-category" className="field-label">
                Categoria
              </label>
              <select
                id="item-category"
                className="field-input"
                disabled={isEditing}
                {...register('category', {
                  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                    // Kitchen categories always prepare their items: pick
                    // Pizzas/Pratos and the flag comes along, staying
                    // editable so unchecking surfaces the schema refusal.
                    if (isKitchenCategory(event.target.value)) {
                      setValue('requiresPreparation', true);
                    }
                  },
                })}
              >
                {CATEGORY_ORDER.map((category) => (
                  <option key={category} value={category}>
                    {categoryLabel(category)}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p role="alert" className="mt-1 text-sm text-red-700">
                  {errors.category.message}
                </p>
              )}
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" {...register('requiresPreparation')} />
                Exige preparo
              </label>
              {errors.requiresPreparation && (
                <p role="alert" className="mt-1 text-sm text-red-700">
                  {errors.requiresPreparation.message}
                </p>
              )}
            </div>
            <fieldset className="space-y-1">
              <legend className="field-label">Ingredientes</legend>
              {ingredients.length === 0 && (
                <p className="text-sm text-stone-600">
                  Nenhum ingrediente cadastrado.
                </p>
              )}
              {ingredients.map((ingredient) => (
                <label
                  key={ingredient.id}
                  className="flex items-center gap-2 text-sm text-stone-700"
                >
                  <input
                    type="checkbox"
                    value={ingredient.id}
                    {...register('ingredientIds')}
                  />
                  {ingredient.name}
                  {!ingredient.available && (
                    <span className="text-xs font-medium text-stone-500">
                      Indisponível
                    </span>
                  )}
                </label>
              ))}
            </fieldset>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={onClose}
                className="bg-stone-200 text-stone-800 hover:bg-stone-300"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando…' : 'Salvar item'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
