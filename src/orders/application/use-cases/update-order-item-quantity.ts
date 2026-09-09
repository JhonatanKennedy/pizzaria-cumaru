import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';

export interface IUpdateOrderItemQuantityParams {
  orderId: string;
  orderItemId: string;
  quantity: number;
}

// Set an item's quantity to an absolute target (>= 1) while the order is
// open, whatever the item's preparation status — the kitchen reads live
// order items. Frozen orders refuse; a no-op target saves nothing.
// Feature: 03_table_order.feature.
@Injectable()
export class UpdateOrderItemQuantityUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: IUpdateOrderItemQuantityParams): Promise<void> {
    const order = await this.ordersRepository.findById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const status = order.getStatus();
    if (status === EOrderStatus.CLOSED) {
      throw new Error('Cannot change a closed order');
    }
    if (status === EOrderStatus.CANCELLED) {
      throw new Error('Cannot change a cancelled order');
    }

    const item = order
      .getItems()
      .find((entry) => entry.getId() === params.orderItemId);
    if (!item) {
      throw new Error('Item not found');
    }

    const current = item.getQuantity();
    if (params.quantity === current) {
      return;
    }

    if (params.quantity > current) {
      item.increaseQuantity(params.quantity - current);
    } else {
      item.decreaseQuantity(current - params.quantity);
    }
    await this.ordersRepository.save(order);
  }
}
