import { useState } from 'react';
import { toErrorMessage } from '@lib/errors';
import { useCatalog } from '../../hooks/use-catalog';
import { IngredientsTab } from './parts/IngredientsTab';
import { MenuTab } from './parts/MenuTab';

type TActiveTab = 'items' | 'ingredients';

export function MenuPage(): React.ReactNode {
  const { menuQuery, ingredientsQuery } = useCatalog();
  const [activeTab, setActiveTab] = useState<TActiveTab>('items');

  if (menuQuery.isPending || ingredientsQuery.isPending) {
    return <p className="text-stone-600">Carregando…</p>;
  }
  if (!menuQuery.data || !ingredientsQuery.data) {
    return (
      <p role="alert" className="text-red-700">
        {toErrorMessage(menuQuery.error ?? ingredientsQuery.error)}
      </p>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">Cardápio e estoque</h1>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={
            activeTab === 'items'
              ? 'rounded-full bg-red-700 px-3 py-1 text-sm font-medium text-white'
              : 'rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700'
          }
        >
          Itens
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('ingredients')}
          className={
            activeTab === 'ingredients'
              ? 'rounded-full bg-red-700 px-3 py-1 text-sm font-medium text-white'
              : 'rounded-full bg-stone-200 px-3 py-1 text-sm font-medium text-stone-700'
          }
        >
          Ingredientes
        </button>
      </div>
      {activeTab === 'items' ? (
        <MenuTab items={menuQuery.data} />
      ) : (
        <IngredientsTab ingredients={ingredientsQuery.data} />
      )}
    </div>
  );
}
