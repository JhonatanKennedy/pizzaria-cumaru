import { Inject, Injectable } from '@nestjs/common';
import { TABLES_REPOSITORY } from '../../domain/repositories/tables-repository.js';
import type { ITablesRepository } from '../../domain/repositories/tables-repository.js';
import { ORDERS_REPOSITORY } from '../../../orders/domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../../orders/domain/repositories/orders-repository.js';

// Remove a registered table. A table that ever had an order cannot be
// deleted — order history must keep its table link.
// Feature: 10_table_management.feature.
@Injectable()
export class DeleteTableUseCase {
  constructor(
    @Inject(TABLES_REPOSITORY)
    private readonly tablesRepository: ITablesRepository,
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
  ) {}

  async execute(tableId: string): Promise<void> {
    const table = await this.tablesRepository.findById(tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    if (await this.ordersRepository.existsOrderForTable(tableId)) {
      throw new Error('Cannot delete a table that has orders');
    }

    await this.tablesRepository.deleteTable(tableId);
  }
}
