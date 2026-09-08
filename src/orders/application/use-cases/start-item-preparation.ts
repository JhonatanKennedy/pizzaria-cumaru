import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';

export interface IStartItemPreparationParams {
  orderId: string;
  itemId: string;
}

// Move an item from Pending to Preparing (started by the kitchen or the manager).
// Feature: 06_cook_profile.feature.
@Injectable()
export class StartItemPreparationUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: IStartItemPreparationParams): Promise<void> {
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

    item.startPreparation();
    await this.ordersRepository.save(order);
  }
}
