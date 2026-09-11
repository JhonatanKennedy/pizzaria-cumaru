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

// A table has no name, so its label is what every screen calls it — and what
// the search on the registry matches against: typing "7" and typing "mesa 7"
// both find Mesa 7.
export function tableLabel(table: { number: number }): string {
  return `Mesa ${table.number}`;
}
