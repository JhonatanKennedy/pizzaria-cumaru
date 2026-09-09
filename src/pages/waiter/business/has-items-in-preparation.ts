// Mirrors the backend's close guard: closing is refused while any kitchen
// item of the order is still Pending or Preparing. A null status means the
// item never entered the kitchen flow (drinks and sides), so it never blocks.
export function hasItemsInPreparation(
  items: ReadonlyArray<{ status: string | null }>,
): boolean {
  return items.some(
    (item) => item.status === 'Pending' || item.status === 'Preparing',
  );
}
