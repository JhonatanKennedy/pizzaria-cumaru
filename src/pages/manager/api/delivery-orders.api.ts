import { apiRequest } from '@api/http-client';
import {
  createdOrderSchema,
  type IAddItemPayload,
  type TCreatedOrder,
} from '@api/orders.api';
import type { TDeliveryStatus } from '../business/delivery-status';

export interface ICreateDeliveryOrderPayload {
  userId: number;
  customerName: string;
  phone: string;
  address: string;
}

export async function createDeliveryOrder(
  payload: ICreateDeliveryOrderPayload,
): Promise<TCreatedOrder> {
  const data = await apiRequest('/orders', {
    method: 'POST',
    body: JSON.stringify({ ...payload, type: 'Delivery' }),
  });
  return createdOrderSchema.parse(data);
}

export async function addItemToDeliveryOrder(
  orderId: string,
  payload: IAddItemPayload,
): Promise<void> {
  await apiRequest(`/orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateDeliveryOrderStatus(
  orderId: string,
  status: TDeliveryStatus,
): Promise<void> {
  await apiRequest(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
