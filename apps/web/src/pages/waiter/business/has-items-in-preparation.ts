import { isInKitchen } from '@lib/kitchen-item';

// Mirrors the backend's close guard: closing is refused while any kitchen item
// of the order is still Pending or Preparing.
export function hasItemsInPreparation(
  items: ReadonlyArray<{ status: string | null }>,
): boolean {
  return items.some((item) => isInKitchen(item.status));
}
