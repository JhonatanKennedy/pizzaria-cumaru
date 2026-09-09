import type { TMenuListing } from '@api/catalog.api';
import { catalogById, REMOVED_ITEM_LABEL } from '@lib/catalog';
import type { TDaySale, TDaySaleItem } from '../api/daily-sales.api';

export type TEnrichedSaleItem = TDaySaleItem & {
  name: string;
  // A line whose item left the menu keeps its quantity but carries no
  // category, so it never matches a category filter nor a category total.
  category: string | null;
  unitPrice: number | null;
};

export type TEnrichedSale = Omit<TDaySale, 'items'> & {
  items: TEnrichedSaleItem[];
};

export function enrichDaySales(
  sales: TDaySale[],
  menu: TMenuListing,
): TEnrichedSale[] {
  const menuById = catalogById(menu);
  return sales.map((sale) => ({
    ...sale,
    items: sale.items.map((line) => {
      const menuItem = menuById.get(line.itemId);
      return {
        ...line,
        name: menuItem?.name ?? REMOVED_ITEM_LABEL,
        category: menuItem?.category ?? null,
        unitPrice: menuItem?.price ?? null,
      };
    }),
  }));
}
