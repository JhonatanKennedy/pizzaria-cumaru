import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';

export interface IFinishItemPreparationParams {
  orderId: string;
  itemId: string;
}

// Confirm an item is ready (status -> Ready). The order stays open and the
// other items keep their current status.
// Feature: 06_cook_profile.feature.
@Injectable()
export class FinishItemPreparationUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: IFinishItemPreparationParams): Promise<void> {
    const order = await this.ordersRepository.findById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const item = order
      .getItems()
      .find((entry) => entry.getId() === params.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    item.finishPreparation();
    await this.ordersRepository.save(order);
  }
}
