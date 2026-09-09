// Payment methods appear in the manager day-view (sale cards, filters) and in
// the waiter close-order dialog, so the labels are shared. Unknown values fall
// back to the backend string, as lib/catalog.ts does for categories.
export const PAYMENT_TYPES = ['Cash', 'CreditCard', 'Pix'] as const;
export type TPaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_LABELS: Record<string, string> = {
  Cash: 'Dinheiro',
  CreditCard: 'Cartão',
  Pix: 'Pix',
};

export function paymentLabel(payment: string): string {
  return PAYMENT_LABELS[payment] ?? payment;
}
