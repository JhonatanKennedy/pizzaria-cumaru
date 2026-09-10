import { Inject, Injectable } from '@nestjs/common';
import { TABLES_REPOSITORY } from '../../domain/repositories/tables-repository.js';
import type { ITablesRepository } from '../../domain/repositories/tables-repository.js';

export interface IRenameTableParams {
  tableId: string;
  number: number;
}

// Renumber a table. Orders keep their reference to the table id, so history
// follows the renumber.
// Feature: 10_table_management.feature.
@Injectable()
export class RenameTableUseCase {
  constructor(
    @Inject(TABLES_REPOSITORY)
    private readonly tablesRepository: ITablesRepository,
  ) {}

  async execute(params: IRenameTableParams): Promise<void> {
    const table = await this.tablesRepository.findById(params.tableId);
    if (!table) {
      throw new Error('Table not found');
    }

    const existing = await this.tablesRepository.findByNumber(params.number);
    if (existing && existing.getId() !== table.getId()) {
      throw new Error('Table number already exists');
    }

    table.rename(params.number);
    await this.tablesRepository.saveTable(table);
  }
}
