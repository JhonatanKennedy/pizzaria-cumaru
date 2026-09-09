import type { TOrderListing } from './schemas';
import type { TMenuListing } from '@api/catalog.api';

export const REMOVED_ITEM_LABEL = 'Item removido do cardápio';

export interface TEnrichedOrderItem {
  id: string;
  itemId: string;
  quantity: number;
  status: string | null;
  name: string;
  unitPrice: number | null;
}

export type TEnrichedOrder = Omit<TOrderListing, 'items'> & {
  items: TEnrichedOrderItem[];
};

export function enrichOrder(
  order: TOrderListing,
  menu: TMenuListing,
): TEnrichedOrder {
  const menuById = new Map(menu.map((item) => [item.id, item]));

  return {
    ...order,
    items: order.items.map((line) => {
      const menuItem = menuById.get(line.itemId);
      return {
        ...line,
        name: menuItem?.name ?? REMOVED_ITEM_LABEL,
        unitPrice: menuItem?.price ?? null,
      };
    }),
  };
}
