import type { TOrderListing } from '@api/orders.api';
import type { TMenuListing } from '@api/catalog.api';
import { catalogById, REMOVED_ITEM_LABEL } from './catalog';

export type TEnrichedOrderItem = TOrderListing['items'][number] & {
  name: string;
};

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
    items: order.items.map((line) => ({
      ...line,
      // Only the name comes from the catalog join: unitPrice records what
      // was charged when the line was added (a composed pizza carries the
      // max-flavor price) and parts ride the recorded line.
      name: menuById.get(line.itemId)?.name ?? REMOVED_ITEM_LABEL,
    })),
  };
}
