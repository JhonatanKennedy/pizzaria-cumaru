import { Inject, Injectable } from '@nestjs/common';
import { TABLES_REPOSITORY } from '../../domain/repositories/tables-repository.js';
import type { ITablesRepository } from '../../domain/repositories/tables-repository.js';
import { ORDERS_REPOSITORY } from '../../../orders/domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../../orders/domain/repositories/orders-repository.js';

export interface ITableOpenOrderSummary {
  orderId: string;
  totalPrice: number;
}

export interface ITableListingEntry {
  id: string;
  number: number;
  openOrder: ITableOpenOrderSummary | null;
}

// List every registered table with its open local order summary — the
// waiter's floor view: free tables carry no open order, occupied tables
// carry the order id and running total.
// Features: 03_table_order.feature, 10_table_management.feature.
@Injectable()
export class ListTablesUseCase {
  constructor(
    @Inject(TABLES_REPOSITORY)
    private readonly tablesRepository: ITablesRepository,
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(): Promise<ITableListingEntry[]> {
    const tables = await this.tablesRepository.findAll();
    const openOrders = await this.ordersRepository.findAllOpen();

    const openOrderByTableId = new Map<string, ITableOpenOrderSummary>();
    for (const order of openOrders) {
      const tableId = order.getTableId();
      if (tableId) {
        openOrderByTableId.set(tableId, {
          orderId: order.getId(),
          totalPrice: order.totalPrice,
        });
      }
    }

    return tables.map((table) => ({
      id: table.getId(),
      number: table.getNumber(),
      openOrder: openOrderByTableId.get(table.getId()) ?? null,
    }));
  }
}
