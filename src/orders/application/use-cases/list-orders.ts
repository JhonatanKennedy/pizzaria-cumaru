import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';

export interface IOrderListingItem {
  id: string;
  itemId: string;
  quantity: number;
  status: string | null;
}

export interface IOrderListingOrder {
  id: string;
  waiterName: string | null;
  type: string;
  status: string;
  tableId?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  deliveredAt?: Date;
  createdAt: Date;
  totalPrice: number;
  items: IOrderListingItem[];
}

// List the day's orders, showing the responsible waiter and the preparation
// status of each item (so the waiter can track them); delivery orders also
// carry their customer data and delivery time (the manager's delivery screen).
// Features: 04_delivery_order.feature, 05_waiter_profile.feature, 07_manager_profile.feature.
@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(day: Date): Promise<IOrderListingOrder[]> {
    const entries = await this.ordersRepository.findAllForListing(day);
    return entries.map(({ order, waiterName }) => ({
      id: order.getId(),
      waiterName,
      type: order.getType(),
      status: order.getStatus(),
      tableId: order.getTableId(),
      customerName: order.getCustomerName(),
      phone: order.getPhone(),
      address: order.getAddress(),
      deliveredAt: order.getDeliveredAt(),
      createdAt: order.getCreatedAt(),
      totalPrice: order.totalPrice,
      items: order.getItems().map((item) => ({
        id: item.getId(),
        itemId: item.getItemId(),
        quantity: item.getQuantity(),
        status: item.getStatus() ?? null,
      })),
    }));
  }
}
