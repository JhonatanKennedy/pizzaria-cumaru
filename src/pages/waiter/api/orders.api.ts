import { apiRequest } from '@api/http-client';
import {
  createdOrderSchema,
  orderListingArraySchema,
  type TCreatedOrder,
  type TOrderListing,
} from '../business/schemas';

export interface IAddItemPayload {
  itemId: string;
  quantity?: number;
  flavors?: string[];
  notes?: string;
}

export async function listOrders(): Promise<TOrderListing[]> {
  const data = await apiRequest('/orders');
  return orderListingArraySchema.parse(data);
}

export async function createTableOrder(
  userId: number,
  tableId: string,
): Promise<TCreatedOrder> {
  const data = await apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({ userId, type: 'Local', tableId }),
  });
  return createdOrderSchema.parse(data);
}

export async function addItemToOrder(
  orderId: string,
  payload: IAddItemPayload,
): Promise<void> {
  await apiRequest(`/orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function cancelOrderItem(
  orderId: string,
  orderItemId: string,
  reason: string,
): Promise<void> {
  await apiRequest(`/orders/${orderId}/items/${orderItemId}/cancellation`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function cancelOrder(
  orderId: string,
  reason: string,
): Promise<void> {
  await apiRequest(`/orders/${orderId}/cancellation`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function updateOrderItemQuantity(
  orderId: string,
  orderItemId: string,
  quantity: number,
): Promise<void> {
  await apiRequest(`/orders/${orderId}/items/${orderItemId}/quantity`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}
