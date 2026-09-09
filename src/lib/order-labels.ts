export const ORDER_STATUS_LABELS: Record<string, string> = {
  Open: 'Aberta',
  Closed: 'Fechada',
  Cancelled: 'Cancelado',
  Preparing: 'Preparando',
  'Out for delivery': 'Saiu para entrega',
  Delivered: 'Entregue',
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}
