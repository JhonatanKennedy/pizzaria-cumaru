import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';

export interface ICancelItemPreparationParams {
  orderId: string;
  itemId: string;
}

// Cancel an item that is "Preparing" from the kitchen panel, recording the
// cancellation in the order history. Items still "Pending" cannot be
// cancelled here (the order-side cancellation covers them) and "Ready" items
// are not cancellable through either path.
// Feature: 06_cook_profile.feature.
@Injectable()
export class CancelItemPreparationUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: ICancelItemPreparationParams): Promise<void> {
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

    order.cancelPreparationItem(params.itemId, new Date());
    await this.ordersRepository.save(order);
  }
}
