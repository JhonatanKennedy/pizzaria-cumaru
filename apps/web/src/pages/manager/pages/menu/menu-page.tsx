import { useState } from 'react';
import { Button } from '@components/Button';
import { Card } from '@components/Card';
import { LoadingRegion } from '@components/LoadingRegion';
import { Skeleton } from '@components/Skeleton';
import { toErrorMessage } from '@lib/errors';
import { IngredientFormDialog } from '../../components/IngredientFormDialog';
import { ItemFormDialog } from '../../components/ItemFormDialog';
import { useCatalog } from '../../hooks/use-catalog';
import { IngredientsTab } from './parts/IngredientsTab';
import { MenuTab } from './parts/MenuTab';
import { MenuTabs, type TMenuTabId } from './parts/MenuTabs';

const ROW_PLACEHOLDERS = [1, 2, 3, 4, 5] as const;

// The header action belongs to the page, not to the tab: both tabs create a
// record of the catalog, and keeping the button here is what lets it hold the
// same corner as "Adicionar mesa" and "Novo pedido de entrega" do on theirs.
const CREATE_LABELS: Record<TMenuTabId, string> = {
  items: 'Novo item',
  ingredients: 'Novo ingrediente',
};

export function MenuPage(): React.ReactNode {
  const { menuQuery, ingredientsQuery } = useCatalog();
  const [activeTab, setActiveTab] = useState<TMenuTabId>('items');
  const [creating, setCreating] = useState(false);

  const menu = menuQuery.data;
  const ingredients = ingredientsQuery.data;

  const changeTab = (tab: TMenuTabId): void => {
    setActiveTab(tab);
    // A dialog left open over the tab it was opened from would otherwise
    // reappear, retargeted, when that tab comes back.
    setCreating(false);
  };

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
    if (!menu || !ingredients) {
      return (
        <p role="alert" className="text-red-700">
          {toErrorMessage(menuQuery.error ?? ingredientsQuery.error)}
        </p>
      );
    }
    return (
      <MenuTabs active={activeTab} onChange={changeTab}>
        {activeTab === 'items' ? (
          <MenuTab items={menu} ingredients={ingredients} />
        ) : (
          <IngredientsTab ingredients={ingredients} />
        )}
      </MenuTabs>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-stone-900">
          Cardápio e estoque
        </h1>
        {/* Disabled until the catalog has landed: the item form pre-checks
            ingredients, and a dialog opened over a catalogue it never saw would
            offer an empty list. */}
        <Button
          onClick={() => setCreating(true)}
          disabled={!menu || !ingredients}
        >
          {CREATE_LABELS[activeTab]}
        </Button>
      </div>
      {renderBody()}
      {creating && menu && ingredients && activeTab === 'items' && (
        <ItemFormDialog
          ingredients={ingredients}
          onClose={() => setCreating(false)}
        />
      )}
      {creating && ingredients && activeTab === 'ingredients' && (
        <IngredientFormDialog onClose={() => setCreating(false)} />
      )}
    </div>
  );
}
