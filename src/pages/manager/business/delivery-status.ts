export const DELIVERY_STATUSES = [
  'Preparing',
  'Out for delivery',
  'Delivered',
] as const;

export type TDeliveryStatus = (typeof DELIVERY_STATUSES)[number];

// The delivery status cycle (04_delivery_order.feature): each order status
// maps to the single next step; anything else has no next step.
const NEXT_STATUS: Record<string, TDeliveryStatus> = {
  Open: 'Preparing',
  Preparing: 'Out for delivery',
  'Out for delivery': 'Delivered',
};

export function nextDeliveryStatus(status: string): TDeliveryStatus | null {
  return NEXT_STATUS[status] ?? null;
}

export const DELIVERY_ACTION_LABELS: Record<TDeliveryStatus, string> = {
  Preparing: 'Iniciar preparo',
  'Out for delivery': 'Saiu para entrega',
  Delivered: 'Marcar como entregue',
};
