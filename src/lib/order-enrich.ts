import type { TOrderListing } from '@api/orders.api';
import type { TMenuListing } from '@api/catalog.api';
import { catalogById, REMOVED_ITEM_LABEL } from '@lib/catalog';

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
  const menuById = catalogById(menu);

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
