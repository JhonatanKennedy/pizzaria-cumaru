import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../../prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaTablesRepository } from './prisma-tables-repository.js';
import { Table } from '../domain/entities/table.js';

loadEnv({ path: '.env.local' });

const TEST_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

function makeClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_URL }),
  });
}

describe('PrismaTablesRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaTablesRepository;

  beforeEach(async () => {
    prisma = makeClient();
    await prisma.orderItem.deleteMany();
    await prisma.orderCancellation.deleteMany();
    await prisma.order.deleteMany();
    await prisma.table.deleteMany();
    repository = new PrismaTablesRepository(prisma as never);
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should round-trip a table through save', async () => {
    const table = Table.create({ id: 'table-1', number: 5 });

    await repository.saveTable(table);

    expect(await repository.findById('table-1')).toEqual(table);
  });

  it('should renumber a table on save', async () => {
    const table = Table.create({ id: 'table-1', number: 5 });
    await repository.saveTable(table);
    table.rename(7);

    await repository.saveTable(table);

    expect((await repository.findById('table-1'))?.getNumber()).toBe(7);
  });

  it('should find a table by its number', async () => {
    const table = Table.create({ id: 'table-1', number: 5 });
    await repository.saveTable(table);

    expect(await repository.findByNumber(5)).toEqual(table);
    expect(await repository.findByNumber(6)).toBeNull();
  });

  it('should list tables ordered by number', async () => {
    await repository.saveTable(Table.create({ id: 'table-1', number: 9 }));
    await repository.saveTable(Table.create({ id: 'table-2', number: 2 }));
    await repository.saveTable(Table.create({ id: 'table-3', number: 5 }));

    const tables = await repository.findAll();

    expect(tables.map((table) => table.getNumber())).toEqual([2, 5, 9]);
  });

  it('should delete a table', async () => {
    const table = Table.create({ id: 'table-1', number: 5 });
    await repository.saveTable(table);

    await repository.deleteTable('table-1');

    expect(await repository.findById('table-1')).toBeNull();
  });

  it('should return null for an unknown id', async () => {
    expect(await repository.findById('ghost')).toBeNull();
  });
});
