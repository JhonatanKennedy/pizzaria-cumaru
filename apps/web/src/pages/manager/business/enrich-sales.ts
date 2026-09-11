import type { TMenuListing } from '@api/catalog.api';
import type { TTableListing } from '@api/tables.api';
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
  // The sale carries the table's id, which is a uuid and reads as nothing. The
  // number is the table's identity to everyone who works the floor, so it is
  // resolved here — and stays null when the table is not on the floor anymore,
  // which is the report declining to invent a number rather than a gap.
  tableNumber: number | null;
  items: TEnrichedSaleItem[];
};

export function enrichDaySales(
  sales: TDaySale[],
  menu: TMenuListing,
  tables: TTableListing,
): TEnrichedSale[] {
  const menuById = catalogById(menu);
  const numberById = new Map(tables.map((table) => [table.id, table.number]));
  return sales.map((sale) => ({
    ...sale,
    tableNumber:
      sale.tableId === undefined
        ? null
        : (numberById.get(sale.tableId) ?? null),
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
