import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TABLES_REPOSITORY } from '../../domain/repositories/tables-repository.js';
import type { ITablesRepository } from '../../domain/repositories/tables-repository.js';
import { Table } from '../../domain/entities/table.js';

export interface ICreateTableParams {
  number: number;
}

// Register a table so waiters can open local orders against it. The table
// starts free and appears immediately in the floor listing.
// Feature: 10_table_management.feature.
@Injectable()
export class CreateTableUseCase {
  constructor(
    @Inject(TABLES_REPOSITORY)
    private readonly tablesRepository: ITablesRepository,
  ) {}

  async execute(params: ICreateTableParams): Promise<void> {
    const existing = await this.tablesRepository.findByNumber(params.number);
    if (existing) {
      throw new Error('Table number already exists');
    }

    const table = Table.create({ id: randomUUID(), number: params.number });
    await this.tablesRepository.saveTable(table);
  }
}
