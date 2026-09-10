// Mirrors the backend's increase guard: once the kitchen has finished an
// item, a further portion would never be made, so the increase is refused.
// A null status means the item never entered the kitchen flow, so it stays
// adjustable at any moment.
export function canIncreaseItemQuantity(status: string | null): boolean {
  return status !== 'Ready';
}
