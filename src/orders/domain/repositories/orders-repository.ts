import type { Order } from '../entities/orders.js';

export interface IOrderListingEntry {
  order: Order;
  waiterName: string | null;
}

export interface IOrdersRepository {
  findById(id: string): Promise<Order | null>;
  findAllOpen(): Promise<Order[]>;
  findOpenByTableId(tableId: string): Promise<Order | null>;
  findCompleted(day: Date): Promise<Order[]>;
  findAllForListing(day: Date): Promise<IOrderListingEntry[]>;
  save(order: Order): Promise<void>;
}

export const ORDERS_REPOSITORY = Symbol('IOrdersRepository');
