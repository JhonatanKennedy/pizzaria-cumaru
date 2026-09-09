import { z } from 'zod';
import { apiRequest } from '@api/http-client';
import { flavorPartSchema } from '@api/orders.api';

export const KITCHEN_QUEUE_KEY = ['kitchen-queue'] as const;

// Mirrors GET /kitchen/queue (backend ListKitchenQueueUseCase). The panel
// is anonymous, so tableId is deliberately not modeled. notes is nullish
// and parts defaults to [] — until the backend slice lands, a queue
// without the fields must still render (tiles just show no extra lines).
export const kitchenQueueOrderSchema = z.object({
  orderId: z.string(),
  type: z.enum(['Local', 'Delivery']),
  createdAt: z.string(),
  items: z.array(
    z.object({
      orderItemId: z.string(),
      itemId: z.string(),
      name: z.string(),
      quantity: z.number().int().positive(),
      status: z.enum(['Pending', 'Preparing']),
      createdAt: z.string(),
      notes: z.string().nullish(),
      parts: z.array(flavorPartSchema).default([]),
    }),
  ),
});

export type TKitchenQueueItem = z.infer<
  typeof kitchenQueueOrderSchema
>['items'][number];

export type TKitchenQueueOrder = z.infer<typeof kitchenQueueOrderSchema>;

export const kitchenQueueSchema = z.object({
  delivery: z.array(kitchenQueueOrderSchema),
  local: z.array(kitchenQueueOrderSchema),
});

export type TKitchenQueue = z.infer<typeof kitchenQueueSchema>;

export async function listKitchenQueue(): Promise<TKitchenQueue> {
  const data = await apiRequest('/kitchen/queue');
  return kitchenQueueSchema.parse(data);
}

export async function startItemPreparation(
  orderId: string,
  orderItemId: string,
): Promise<void> {
  await apiRequest(`/kitchen/orders/${orderId}/items/${orderItemId}/start`, {
    method: 'POST',
  });
}

export async function finishItemPreparation(
  orderId: string,
  orderItemId: string,
): Promise<void> {
  await apiRequest(`/kitchen/orders/${orderId}/items/${orderItemId}/finish`, {
    method: 'POST',
  });
}

export async function cancelItemPreparation(
  orderId: string,
  orderItemId: string,
): Promise<void> {
  await apiRequest(`/kitchen/orders/${orderId}/items/${orderItemId}/cancel`, {
    method: 'POST',
  });
}
