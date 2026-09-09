import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  addItemFormSchema,
  type TAddItemFormValues,
} from '../../business/schemas';
import type { TMenuItem } from '@api/catalog.api';
import { CATEGORY_ORDER, categoryLabel } from '@lib/catalog';
import { useAddItem } from '../../hooks/use-add-item';
import { Button } from '@components/Button';
import { TextField } from '@components/TextField';
import { formatBRL } from '@lib/format';
import { toErrorMessage } from '@lib/errors';

interface AddItemPanelProps {
  orderId: string;
  items: TMenuItem[];
}

export function AddItemPanel({
  orderId,
  items,
}: AddItemPanelProps): React.ReactNode {
  const [selectedCategory, setSelectedCategory] = useState<string>(
    CATEGORY_ORDER[0],
  );
  const [selectedItem, setSelectedItem] = useState<TMenuItem | null>(null);
  const addItem = useAddItem();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TAddItemFormValues>({
    resolver: zodResolver(addItemFormSchema),
    defaultValues: { quantity: 1, flavors: '', notes: '' },
  });

  const visibleItems = items.filter(
    (item) => item.category === selectedCategory,
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedItem) {
      return;
    }
    const flavors = values.flavors
      .split(',')
      .map((flavor) => flavor.trim())
      .filter((flavor) => flavor.length > 0);
    try {
      await addItem.mutateAsync({
        orderId,
        payload: {
          itemId: selectedItem.id,
          quantity: values.quantity,
          ...(flavors.length > 0 ? { flavors } : {}),
          ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
        },
      });
      setSelectedItem(null);
      reset();
    } catch (error) {
      setError('root', { message: toErrorMessage(error) });
    }
  });

  return (
    <div className="card">
      <h2 className="font-semibold text-stone-900">Adicionar item</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((category) => (
          <button
            type="button"
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={
              selectedCategory === category
                ? 'rounded-full bg-red-700 px-3 py-1 text-sm font-medium text-white'
                : 'rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700'
            }
          >
            {categoryLabel(category)}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <button
            type="button"
            key={item.id}
            disabled={!item.available}
            onClick={() => setSelectedItem(item)}
            className={
              selectedItem?.id === item.id
                ? 'rounded-md border border-red-600 bg-red-50 p-3 text-left ring-1 ring-red-600'
                : 'rounded-md border border-stone-200 bg-white p-3 text-left hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50'
            }
          >
            <span className="block font-medium text-stone-900">
              {item.name}
            </span>
            <span className="block text-sm text-stone-600">
              {formatBRL(item.price)}
            </span>
            {!item.available && (
              <span className="mt-1 block text-xs font-medium text-stone-500">
                Indisponível
              </span>
            )}
          </button>
        ))}
      </div>
      {selectedItem && (
        <form onSubmit={onSubmit} noValidate className="mt-4 space-y-4">
          {errors.root && (
            <p
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {errors.root.message}
            </p>
          )}
          <div className="flex items-end gap-3">
            <div className="w-24">
              <TextField
                id="quantity"
                label="Quantidade"
                type="number"
                min={1}
                error={errors.quantity?.message}
                {...register('quantity', { valueAsNumber: true })}
              />
            </div>
            {selectedItem.category === 'PIZZA' && (
              <div className="flex-1">
                <TextField
                  id="flavors"
                  label="Sabores (separados por vírgula)"
                  error={errors.flavors?.message}
                  {...register('flavors')}
                />
              </div>
            )}
          </div>
          <TextField
            id="notes"
            label="Observações"
            error={errors.notes?.message}
            {...register('notes')}
          />
          <div className="flex items-center justify-between">
            <span className="font-medium text-stone-900">
              {selectedItem.name} — {formatBRL(selectedItem.price)}
            </span>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adicionando…' : 'Adicionar ao pedido'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
