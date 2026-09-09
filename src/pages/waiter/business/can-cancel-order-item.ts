// Mirrors the backend's item-cancel guard: only a preparation item that
// already left Pending is no longer removable. A null status means the item
// never entered the kitchen flow, so it stays cancellable at any moment.
export function canCancelOrderItem(status: string | null): boolean {
  return status === null || status === 'Pending';
}
