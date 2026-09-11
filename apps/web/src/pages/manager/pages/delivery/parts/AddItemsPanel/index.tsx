import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { TMenuItem } from '@api/catalog.api';
import type { TFlavorPart } from '@api/orders.api';
import {
  CATEGORY_ORDER,
  categoryLabel,
  filterCatalogItems,
} from '@lib/catalog';
import { toErrorMessage } from '@lib/errors';
import { formatBRL } from '@lib/format';
import { Button } from '@components/Button';
import { Chip } from '@components/Chip';
import { FlavorComposer } from '@components/FlavorComposer';
import { SearchField } from '@components/SearchField';
import { TextField } from '@components/TextField';
import {
  addItemFormSchema,
  type TAddItemFormValues,
} from '../../../../business/delivery-schemas';
import { useAddItem } from '../../../../hooks/use-add-item';

interface AddItemsPanelProps {
  orderId: string;
  items: TMenuItem[];
}

const SEARCH_ID = 'delivery-item-search';

export function AddItemsPanel({
  orderId,
  items,
}: AddItemsPanelProps): React.ReactNode {
  // Pizzas stay the opening view, the way the panel has always opened; the null
  // category is the "Todas" chip, and it is what makes a name searchable
  // outside the category the panel happens to be sitting on.
  const [category, setCategory] = useState<string | null>(CATEGORY_ORDER[0]);
  const [query, setQuery] = useState('');
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

  const visibleItems = filterCatalogItems(items, { category, query });
  const searchQuery = query.trim();
  const scopeText = category === null ? '' : ` em ${categoryLabel(category)}`;
  const queryText = searchQuery === '' ? '' : ` para "${searchQuery}"`;
  const emptyNotice =
    category === null && searchQuery === ''
      ? 'Nenhum item disponível no cardápio.'
      : `Nenhum item${scopeText}${queryText}.`;
  // The manager types a name, not "a name within a category" — so the one thing
  // that empties the grid for a reason she did not intend gets a way out, right
  // where the dead end is.
  const canClearCategory =
    visibleItems.length === 0 && category !== null && searchQuery !== '';

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
      <div className="mt-3">
        <SearchField
          id={SEARCH_ID}
          label="Buscar item"
          placeholder="Buscar item"
          value={query}
          onChange={setQuery}
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
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
              <span className="mt-1 block text-xs font-medium text-stone-600">
                Indisponível
              </span>
            )}
          </button>
        ))}
        {visibleItems.length === 0 && (
          <div className="col-span-full rounded-md border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-600">
            <p role="status">{emptyNotice}</p>
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
          </div>
        )}
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
            // The composer gets the full list, never the filtered slice: the
            // other half of a split can be a flavor the search excluded.
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
