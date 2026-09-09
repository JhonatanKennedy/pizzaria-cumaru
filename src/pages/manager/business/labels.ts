// The day-view screens show the same two order streams, so the labels are
// shared inside the manager context. Unknown values fall back to the backend
// string, as lib/catalog.ts does for categories.
export const ORDER_TYPE_LABELS: Record<string, string> = {
  Local: 'Local',
  Delivery: 'Entrega',
};

export function orderTypeLabel(type: string): string {
  return ORDER_TYPE_LABELS[type] ?? type;
}
