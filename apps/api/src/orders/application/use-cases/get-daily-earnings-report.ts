import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EOrderType } from '../../domain/enums/order-type.js';

export interface IDailyEarningsReport {
  grandTotal: number;
  localTotal: number;
  deliveryTotal: number;
}

// Summarize the day's earnings: closed local orders plus delivered delivery
// orders, with an optional type filter.
// Feature: 07_manager_profile.feature.
@Injectable()
export class GetDailyEarningsReportUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(day: Date, type?: EOrderType): Promise<IDailyEarningsReport> {
    const completed = await this.ordersRepository.findCompleted(day);

    const localTotal = completed
      .filter(
        (order) =>
          order.getType() === EOrderType.LOCAL &&
          order.getStatus() === EOrderStatus.CLOSED,
      )
      .reduce((total, order) => total + order.totalPrice, 0);
    const deliveryTotal = completed
      .filter(
        (order) =>
          order.getType() === EOrderType.DELIVERY &&
          order.getStatus() === EOrderStatus.DELIVERED,
      )
      .reduce((total, order) => total + order.totalPrice, 0);

    if (type === EOrderType.LOCAL) {
      return { grandTotal: localTotal, localTotal, deliveryTotal: 0 };
    }
    if (type === EOrderType.DELIVERY) {
      return { grandTotal: deliveryTotal, localTotal: 0, deliveryTotal };
    }
    return {
      grandTotal: localTotal + deliveryTotal,
      localTotal,
      deliveryTotal,
    };
  }
}
