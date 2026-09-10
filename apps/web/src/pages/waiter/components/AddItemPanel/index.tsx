import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  addItemFormSchema,
  type TAddItemFormValues,
} from '../../business/schemas';
import type { TMenuItem } from '@api/catalog.api';
import type { TFlavorPart } from '@api/orders.api';
import { FlavorComposer } from '@components/FlavorComposer';
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
  // The last composition the composer emitted; empty when the pizza was not
  // split, so plain adds carry no parts field.
  const [parts, setParts] = useState<TFlavorPart[]>([]);
  const addItem = useAddItem();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TAddItemFormValues>({
    resolver: zodResolver(addItemFormSchema),
    defaultValues: { quantity: 1, notes: '' },
  });

  const visibleItems = items.filter(
    (item) => item.category === selectedCategory,
  );

  const selectItem = (item: TMenuItem): void => {
    setSelectedItem(item);
    setParts([]);
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedItem) {
      return;
    }
    try {
      await addItem.mutateAsync({
        orderId,
        payload: {
          itemId: selectedItem.id,
          quantity: values.quantity,
          ...(parts.length > 0 ? { parts } : {}),
          ...(values.notes.trim() ? { notes: values.notes.trim() } : {}),
        },
      });
      setSelectedItem(null);
      setParts([]);
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
            onClick={() => selectItem(item)}
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
            // Keyed by the item so switching pizzas resets the allocation;
            // token-less legacy names render nothing (plain whole pizza).
            <FlavorComposer
              key={selectedItem.id}
              base={selectedItem}
              items={items}
              onChange={setParts}
            />
          )}
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
