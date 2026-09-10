import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';

export interface IUpdateDeliveryOrderStatusParams {
  orderId: string;
  status: string;
}

const DELIVERY_STATUS_START = 'Preparing';
const DELIVERY_STATUS_OUT = 'Out for delivery';

// Advance a delivery order through its status cycle
// (Open -> Preparing -> Out for delivery -> Delivered) and record the
// delivery time when marked as delivered.
// Feature: 04_delivery_order.feature.
@Injectable()
export class UpdateDeliveryOrderStatusUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: IUpdateDeliveryOrderStatusParams): Promise<void> {
    const order = await this.ordersRepository.findById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    if (params.status === DELIVERY_STATUS_START) {
      order.startDeliveryPreparation();
    } else if (params.status === DELIVERY_STATUS_OUT) {
      order.sendOutForDelivery();
    } else {
      order.markDelivered(new Date());
    }
    await this.ordersRepository.save(order);
  }
}
