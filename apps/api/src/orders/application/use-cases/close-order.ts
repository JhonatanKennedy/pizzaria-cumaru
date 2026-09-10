import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';
import { EOrderItemStatus } from '../../domain/enums/order-item-status.js';

export interface ICloseOrderParams {
  orderId: string;
  paymentType: EPaymentType;
  splitInto?: number;
}

export interface ICloseOrderResult {
  id: string;
  status: string;
  paymentType: EPaymentType;
  total: number;
  parts?: number[];
}

// Close a local order with its payment type (manager only — waiter attempts
// are refused). The close waits for the kitchen: an order whose items are
// still "Pending" or "Preparing" cannot be billed. Items that never enter
// the kitchen and items already "Ready" never block.
// Features: 05_waiter_profile.feature, 07_manager_profile.feature.
@Injectable()
export class CloseOrderUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: ICloseOrderParams): Promise<ICloseOrderResult> {
    const order = await this.ordersRepository.findById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    if (order.getType() !== EOrderType.LOCAL) {
      throw new Error('Only local orders can be closed');
    }

    const hasItemInPreparation = order
      .getItems()
      .some(
        (item) =>
          item.getStatus() === EOrderItemStatus.PENDING ||
          item.getStatus() === EOrderItemStatus.PREPARING,
      );
    if (hasItemInPreparation) {
      throw new Error('Cannot close an order with items in preparation');
    }

    order.close(params.paymentType, new Date());
    await this.ordersRepository.save(order);

    const total = order.totalPrice;
    const splitInto = params.splitInto;
    const parts =
      splitInto && splitInto > 0
        ? Array.from({ length: splitInto }, () => total / splitInto)
        : undefined;

    return {
      id: order.getId(),
      status: order.getStatus(),
      paymentType: params.paymentType,
      total,
      parts,
    };
  }
}
