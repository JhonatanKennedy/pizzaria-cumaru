import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';

export interface ICancelOrderParams {
  orderId: string;
  reason: string;
}

// Cancel a whole open table order: cascades over every remaining item
// whatever its preparation status, records the order-level reason, and sets
// the status to "Cancelled" — occupancy queries filter on "Open", so the
// table frees automatically. Feature: 09_cancellation_and_payment.feature.
@Injectable()
export class CancelOrderUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: ICancelOrderParams): Promise<void> {
    const order = await this.ordersRepository.findById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    order.cancelOrder(params.reason, new Date());
    await this.ordersRepository.save(order);
  }
}
