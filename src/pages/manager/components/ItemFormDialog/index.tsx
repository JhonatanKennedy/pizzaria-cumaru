import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { CATEGORY_ORDER, categoryLabel } from '@lib/catalog';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { TextField } from '@components/TextField';
import { toErrorMessage } from '@lib/errors';
import { itemFormSchema, type TItemFormValues } from '../../business/schemas';
import { useCreateItem } from '../../hooks/use-create-item';

interface ItemFormDialogProps {
  onClose: () => void;
}

export function ItemFormDialog({
  onClose,
}: ItemFormDialogProps): React.ReactNode {
  const createItemMutation = useCreateItem();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      category: 'PIZZA',
      requiresPreparation: false,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await createItemMutation.mutateAsync(values);
      onClose();
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 px-4">
      <Card className="w-full max-w-md">
        <div role="dialog" aria-modal="true" aria-label="Novo item">
          <h2 className="text-lg font-bold text-stone-900">Novo item</h2>
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
                {...register('category')}
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
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" {...register('requiresPreparation')} />
              Exige preparo
            </label>
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
