import type { TMenuListing, TMenuItem } from '@api/catalog.api';

export const CATEGORY_ORDER = [
  'PIZZA',
  'DISH',
  'DRINK',
  'DESSERT',
  'SIDE',
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  PIZZA: 'Pizzas',
  DISH: 'Pratos',
  DRINK: 'Bebidas',
  DESSERT: 'Sobremesas',
  SIDE: 'Acompanhamentos',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

// Menu ids are the join key that turns order lines into catalog rows — the
// waiter order detail and the manager day-sales screen both do this join.
export const REMOVED_ITEM_LABEL = 'Item removido do cardápio';

export function catalogById(menu: TMenuListing): Map<string, TMenuItem> {
  return new Map(menu.map((item) => [item.id, item]));
}
