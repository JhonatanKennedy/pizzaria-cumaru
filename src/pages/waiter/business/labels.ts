export const ORDER_STATUS_LABELS: Record<string, string> = {
  Open: 'Aberta',
  Closed: 'Fechada',
  Cancelled: 'Cancelado',
  Preparing: 'Preparando',
  'Out for delivery': 'Saiu para entrega',
  Delivered: 'Entregue',
};

export const ITEM_STATUS_LABELS: Record<string, string> = {
  Pending: 'Pendente',
  Preparing: 'Preparando',
  Ready: 'Pronto',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function itemStatusLabel(status: string | null): string {
  if (!status) {
    return '';
  }
  return ITEM_STATUS_LABELS[status] ?? status;
}
