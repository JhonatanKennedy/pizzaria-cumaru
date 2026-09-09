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
