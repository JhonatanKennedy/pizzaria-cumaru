import { CATEGORY_ORDER } from '@lib/catalog';
import type { TReportType } from '../api/reports.api';
import type { TEnrichedSale } from './enrich-sales';

export interface TDaySalesFilters {
  type: TReportType | null;
  payment: string | null;
  category: string | null;
}

export const NO_SALES_FILTERS: TDaySalesFilters = {
  type: null,
  payment: null,
  category: null,
};

// The sale time is the close time for local sales and the delivery time for
// delivery sales — the two terminal timestamps never both exist.
export function saleTimeOf(sale: TEnrichedSale): string {
  return sale.closedAt ?? sale.deliveredAt ?? '';
}

export function filterDaySales(
  sales: TEnrichedSale[],
  filters: TDaySalesFilters,
): TEnrichedSale[] {
  return sales.filter((sale) => {
    if (filters.type !== null && sale.type !== filters.type) {
      return false;
    }
    // Delivery sales carry no payment method and therefore never match a
    // payment filter.
    if (filters.payment !== null && sale.paymentType !== filters.payment) {
      return false;
    }
    if (
      filters.category !== null &&
      !sale.items.some((line) => line.category === filters.category)
    ) {
      return false;
    }
    return true;
  });
}

export function sortSalesNewestFirst(sales: TEnrichedSale[]): TEnrichedSale[] {
  return [...sales].sort(
    (left, right) =>
      new Date(saleTimeOf(right)).getTime() -
      new Date(saleTimeOf(left)).getTime(),
  );
}

export interface TCategoryQuantity {
  category: string;
  quantity: number;
}

// Units sold per catalog category across the given sales, in the canonical
// category order. Lines whose item left the menu carry no category and are
// counted nowhere.
export function categoryQuantities(
  sales: TEnrichedSale[],
): TCategoryQuantity[] {
  const unitsByCategory = new Map<string, number>();
  for (const sale of sales) {
    for (const line of sale.items) {
      if (line.category === null) {
        continue;
      }
      unitsByCategory.set(
        line.category,
        (unitsByCategory.get(line.category) ?? 0) + line.quantity,
      );
    }
  }
  return CATEGORY_ORDER.map((category) => ({
    category,
    quantity: unitsByCategory.get(category) ?? 0,
  }));
}
