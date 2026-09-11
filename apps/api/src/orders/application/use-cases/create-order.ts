import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { Order } from '../../domain/entities/orders.js';
import { EOrderType } from '../../domain/enums/order-type.js';

export interface ICreateOrderParams {
  userId: number;
  type: EOrderType;
  tableId?: string;
  customerName?: string;
  phone?: string;
  address?: string;
}

export interface IOrderSummary {
  id: string;
  userId: number;
  type: EOrderType;
  status: string;
  tableId?: string;
  customerName?: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  totalPrice: number;
}

// Open a new order for a table (LOCAL type) or a delivery order — waiter or manager.
// Features: 03_table_order.feature, 04_delivery_order.feature, 05_waiter_profile.feature, 07_manager_profile.feature.
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(params: ICreateOrderParams): Promise<IOrderSummary> {
    if (params.type === EOrderType.LOCAL) {
      if (!params.tableId) {
        throw new Error('Table is required for local orders');
      }
      if (!(await this.ordersRepository.existsTable(params.tableId))) {
        throw new Error('Table not found');
      }
      const existing = await this.ordersRepository.findOpenByTableId(
        params.tableId,
      );
      if (existing) {
        throw new Error('Table already has an open order');
      }
    }

    const order = Order.create({
      id: randomUUID(),
      userId: params.userId,
      type: params.type,
      createdAt: new Date(),
      tableId: params.tableId,
      customerName: params.customerName,
      phone: params.phone,
      address: params.address,
    });
    await this.ordersRepository.save(order);
    return this.toSummary(order);
  }

  private toSummary(order: Order): IOrderSummary {
    return {
      id: order.getId(),
      userId: order.getUserId(),
      type: order.getType(),
      status: order.getStatus(),
      tableId: order.getTableId(),
      customerName: order.getCustomerName(),
      phone: order.getPhone(),
      address: order.getAddress(),
      createdAt: order.getCreatedAt(),
      totalPrice: order.totalPrice,
    };
  }
}
