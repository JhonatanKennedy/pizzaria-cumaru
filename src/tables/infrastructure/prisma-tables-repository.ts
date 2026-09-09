import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ITablesRepository } from '../domain/repositories/tables-repository.js';
import { Table } from '../domain/entities/table.js';

@Injectable()
export class PrismaTablesRepository implements ITablesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Table | null> {
    const row = await this.prisma.table.findUnique({ where: { id } });
    return row ? Table.create({ id: row.id, number: row.number }) : null;
  }

  async findByNumber(number: number): Promise<Table | null> {
    const row = await this.prisma.table.findUnique({ where: { number } });
    return row ? Table.create({ id: row.id, number: row.number }) : null;
  }

  async findAll(): Promise<Table[]> {
    const rows = await this.prisma.table.findMany({
      orderBy: { number: 'asc' },
    });
    return rows.map((row) => Table.create({ id: row.id, number: row.number }));
  }

  async saveTable(table: Table): Promise<void> {
    await this.prisma.table.upsert({
      where: { id: table.getId() },
      update: { number: table.getNumber() },
      create: { id: table.getId(), number: table.getNumber() },
    });
  }

  async deleteTable(id: string): Promise<void> {
    await this.prisma.table.delete({ where: { id } });
  }
}
