import { PrismaTablesRepository } from './prisma-tables-repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import { Table } from '../domain/entities/table.js';

// This adapter's contract has two halves: what it makes of the rows Prisma
// hands back, and what it asks Prisma for. Both are checked here against a
// double, so the suite says exactly what the adapter promises and no more —
// whether Postgres honours the `where` is Prisma's to get right, and the e2e
// suite is where a real database still has a say. The floor's ordering is not
// this adapter's job: it is the listing use-case's, and is tested there.

const TABLE_ID = 'table-1';
const TABLE_NUMBER = 5;

type TTableRow = Prisma.TableGetPayload<Record<string, never>>;

function makeRow(overrides: Partial<TTableRow> = {}): TTableRow {
  return { id: TABLE_ID, number: TABLE_NUMBER, ...overrides };
}

function makePrismaDouble() {
  return {
    table: {
      findUnique: vi.fn(
        async (_args: Prisma.TableFindUniqueArgs): Promise<TTableRow | null> =>
          null,
      ),
      findMany: vi.fn(
        async (_args: Prisma.TableFindManyArgs): Promise<TTableRow[]> => [],
      ),
      upsert: vi.fn(
        async (_args: Prisma.TableUpsertArgs): Promise<void> => undefined,
      ),
      delete: vi.fn(
        async (_args: Prisma.TableDeleteArgs): Promise<void> => undefined,
      ),
    },
  };
}

type TPrismaDouble = ReturnType<typeof makePrismaDouble>;

function makeRepository(double: TPrismaDouble): PrismaTablesRepository {
  return new PrismaTablesRepository(double as unknown as PrismaService);
}

describe('PrismaTablesRepository', () => {
  it('should upsert a table with its id and number', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);

    await repository.saveTable(Table.create({ id: TABLE_ID, number: 7 }));

    expect(double.table.upsert).toHaveBeenCalledWith({
      where: { id: TABLE_ID },
      update: { number: 7 },
      create: { id: TABLE_ID, number: 7 },
    });
  });

  it('should map the row it reads by id', async () => {
    const double = makePrismaDouble();
    double.table.findUnique.mockResolvedValue(makeRow());
    const repository = makeRepository(double);

    const table = await repository.findById(TABLE_ID);

    expect(double.table.findUnique).toHaveBeenCalledWith({
      where: { id: TABLE_ID },
    });
    expect(table?.getId()).toBe(TABLE_ID);
    expect(table?.getNumber()).toBe(TABLE_NUMBER);
  });

  it('should return null for an unknown id', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);

    expect(await repository.findById('ghost')).toBeNull();
  });

  it('should map the row it reads by number', async () => {
    const double = makePrismaDouble();
    double.table.findUnique.mockResolvedValue(makeRow());
    const repository = makeRepository(double);

    const table = await repository.findByNumber(TABLE_NUMBER);

    expect(double.table.findUnique).toHaveBeenCalledWith({
      where: { number: TABLE_NUMBER },
    });
    expect(table?.getNumber()).toBe(TABLE_NUMBER);
  });

  it('should return null for an unknown number', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);

    expect(await repository.findByNumber(6)).toBeNull();
  });

  it('should map every row it reads', async () => {
    const double = makePrismaDouble();
    double.table.findMany.mockResolvedValue([
      makeRow({ id: 'table-9', number: 9 }),
      makeRow({ id: 'table-2', number: 2 }),
    ]);
    const repository = makeRepository(double);

    const tables = await repository.findAll();

    expect(tables.map((table) => table.getNumber())).toEqual([9, 2]);
  });

  it('should delete a table by id', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);

    await repository.deleteTable(TABLE_ID);

    expect(double.table.delete).toHaveBeenCalledWith({
      where: { id: TABLE_ID },
    });
  });
});
