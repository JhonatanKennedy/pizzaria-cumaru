// Shared by the waiter and kitchen contexts — item statuses are labeled
// the same way on both the order detail and the kitchen tiles.
export const ITEM_STATUS_LABELS: Record<string, string> = {
  Pending: 'Pendente',
  Preparing: 'Preparando',
  Ready: 'Pronto',
};

export function itemStatusLabel(status: string | null): string {
  if (!status) {
    return '';
  }
  return ITEM_STATUS_LABELS[status] ?? status;
}
