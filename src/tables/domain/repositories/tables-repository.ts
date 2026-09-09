import type { Table } from '../entities/table.js';

export interface ITablesRepository {
  findById(id: string): Promise<Table | null>;
  findByNumber(number: number): Promise<Table | null>;
  findAll(): Promise<Table[]>;
  saveTable(table: Table): Promise<void>;
  deleteTable(id: string): Promise<void>;
}

export const TABLES_REPOSITORY = Symbol('ITablesRepository');
