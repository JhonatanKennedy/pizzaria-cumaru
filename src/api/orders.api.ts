import { z } from 'zod';
import { apiRequest } from '@api/http-client';

// Shared orders listing contract — consumed by the waiter order screens and
// the manager delivery screens (src/api/tables.api.ts is the sibling pattern).
export const ORDERS_QUERY_KEY = ['orders'];

// Mirrors the backend's EOrderType (orders/domain/enums/order-type.ts) —
// sent as-is in create payloads and asserted in the Gherkin specs.
export const ORDER_TYPES = ['Local', 'Delivery'] as const;
export type TOrderType = (typeof ORDER_TYPES)[number];

// A flavor part of a split pizza: the flavor names a registered pizza item
// (same size as the base) and the pieces are the fatias it occupies.
export const flavorPartSchema = z.object({
  name: z.string(),
  pieces: z.number().int().positive(),
});

export type TFlavorPart = z.infer<typeof flavorPartSchema>;

export const orderItemListingSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  quantity: z.number().int().positive(),
  status: z.string().nullable(),
  // The unit price recorded when the item was added (a composed pizza
  // records the max-flavor price); parts is empty for whole items.
  unitPrice: z.number(),
  parts: z.array(flavorPartSchema).default([]),
});

export const orderListingSchema = z.object({
  id: z.string(),
  waiterName: z.string().nullable(),
  type: z.enum(ORDER_TYPES),
  status: z.string(),
  tableId: z.string().optional(),
  createdAt: z.string(),
  totalPrice: z.number(),
  // Delivery-only fields arrive only when set: Express drops undefined JSON
  // keys, so they are optional here — unlike waiterName, which the backend
  // sends as null for orders without an assigned waiter.
  customerName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  deliveredAt: z.string().optional(),
  items: z.array(orderItemListingSchema),
});

export type TOrderListing = z.infer<typeof orderListingSchema>;

export const orderListingArraySchema = z.array(orderListingSchema);

export const createdOrderSchema = z.object({
  id: z.string(),
});

export type TCreatedOrder = z.infer<typeof createdOrderSchema>;

export interface IAddItemPayload {
  itemId: string;
  quantity?: number;
  // The flavor composition when splitting a pizza; omit for a whole item.
  parts?: TFlavorPart[];
  notes?: string;
}

export async function listOrders(): Promise<TOrderListing[]> {
  const data = await apiRequest('/orders');
  return orderListingArraySchema.parse(data);
}
