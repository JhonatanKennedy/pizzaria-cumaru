import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';

export interface IDaySaleItem {
  id: string;
  itemId: string;
  quantity: number;
  status: string | null;
}

export interface IDaySaleOrder {
  id: string;
  waiterName: string | null;
  type: string;
  status: string;
  paymentType: string | null;
  tableId?: string;
  createdAt: Date;
  closedAt: Date | null;
  deliveredAt: Date | null;
  totalPrice: number;
  items: IDaySaleItem[];
}

// List the day's sales — closed local orders and delivered delivery orders —
// with the responsible waiter, the payment method (delivery sales carry none),
// and the sale time (close time for local, delivery time for delivery).
// Feature: 07_manager_profile.feature.
@Injectable()
export class ListDaySalesUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(day: Date): Promise<IDaySaleOrder[]> {
    const entries = await this.ordersRepository.findDaySales(day);
    return entries.map(({ order, waiterName }) => ({
      id: order.getId(),
      waiterName,
      type: order.getType(),
      status: order.getStatus(),
      paymentType: order.getPaymentType() ?? null,
      tableId: order.getTableId(),
      createdAt: order.getCreatedAt(),
      closedAt: order.getClosedAt() ?? null,
      deliveredAt: order.getDeliveredAt() ?? null,
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
