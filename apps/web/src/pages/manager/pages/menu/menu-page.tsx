import { useState } from 'react';
import { BackLink } from '@components/BackLink';
import { Card } from '@components/Card';
import { LoadingRegion } from '@components/LoadingRegion';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { useCatalog } from '../../hooks/use-catalog';
import { IngredientsTab } from './parts/IngredientsTab';
import { MenuTab } from './parts/MenuTab';

type TActiveTab = 'items' | 'ingredients';

const ROW_PLACEHOLDERS = [1, 2, 3, 4, 5] as const;

export function MenuPage(): React.ReactNode {
  const { menuQuery, ingredientsQuery } = useCatalog();
  const [activeTab, setActiveTab] = useState<TActiveTab>('items');

  const renderBody = (): React.ReactNode => {
    if (menuQuery.isPending || ingredientsQuery.isPending) {
      return (
        <LoadingRegion>
          <Card>
            <div className="divide-y divide-stone-100">
              {ROW_PLACEHOLDERS.map((placeholder) => (
                <div key={placeholder} className="py-3 first:pt-0 last:pb-0">
                  <Skeleton className="h-5 w-40" />
                </div>
              ))}
            </div>
          </Card>
        </LoadingRegion>
      );
    }
    if (!menuQuery.data || !ingredientsQuery.data) {
      return (
        <p role="alert" className="text-red-700">
          {toErrorMessage(menuQuery.error ?? ingredientsQuery.error)}
        </p>
      );
    }
    return activeTab === 'items' ? (
      <MenuTab items={menuQuery.data} ingredients={ingredientsQuery.data} />
    ) : (
      <IngredientsTab ingredients={ingredientsQuery.data} />
    );
  };

  return (
    <div className="space-y-4">
      <BackLink to="/manager" label="Painel do gerente" />
      <h1 className="text-2xl font-bold text-stone-900">Cardápio e estoque</h1>
      {/* The tab choice is local state, not payload, so it holds its place
          while the catalog loads. */}
      <div className="flex gap-2">
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
      {renderBody()}
    </div>
  );
}
