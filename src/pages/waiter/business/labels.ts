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

export const ORDER_STATUS_LABELS: Record<string, string> = {
  Open: 'Aberta',
  Closed: 'Fechada',
  Preparing: 'Preparando',
  'Out for delivery': 'Saiu para entrega',
  Delivered: 'Entregue',
};

export const ITEM_STATUS_LABELS: Record<string, string> = {
  Pending: 'Pendente',
  Preparing: 'Preparando',
  Ready: 'Pronto',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function itemStatusLabel(status: string | null): string {
  if (!status) {
    return '';
  }
  return ITEM_STATUS_LABELS[status] ?? status;
}
