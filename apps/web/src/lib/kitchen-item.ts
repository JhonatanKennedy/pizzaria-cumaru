// Mirrors the backend's kitchen queue (ListKitchenQueueUseCase), whose statuses
// are exactly Pending and Preparing: an item the cook has not finished is
// either waiting or being made. A null status means the item never entered the
// kitchen flow (drinks and sides), so it is never part of the queue.
//
// Shared by the waiter context's close guard and the manager hub's count — the
// two ask the same question of the same statuses.
export function isInKitchen(status: string | null): boolean {
  return status === 'Pending' || status === 'Preparing';
}
