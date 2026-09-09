import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';

export interface ICancelItemFromOrderParams {
  orderId: string;
  itemId: string;
}

// Cancel an order item, recording the cancellation in the order history.
// Items already "Preparing" cannot be cancelled; items that don't require
// preparation can be cancelled anytime while the order is open.
// Feature: 09_cancellation_and_payment.feature.
@Injectable()
export class CancelItemFromOrderUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: ICancelItemFromOrderParams): Promise<void> {
    const order = await this.ordersRepository.findById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.cancelItem(params.itemId, new Date());
    await this.ordersRepository.save(order);
  }
}
