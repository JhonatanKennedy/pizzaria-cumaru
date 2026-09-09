import { CreateTableUseCase } from './create-table.js';
import { ListTablesUseCase } from './list-tables.js';
import { RenameTableUseCase } from './rename-table.js';
import { DeleteTableUseCase } from './delete-table.js';
import type { ITablesRepository } from '../../domain/repositories/tables-repository.js';
import type { IOrdersRepository } from '../../../orders/domain/repositories/orders-repository.js';
import { Table } from '../../domain/entities/table.js';

const TABLE_ID = 'table-1';
const TABLE_NUMBER = 5;

function makeTable(number: number = TABLE_NUMBER): Table {
  return Table.create({ id: TABLE_ID, number });
}

function makeTablesRepository(
  findById: Table | null = makeTable(),
  findByNumber: Table | null = null,
  findAll: Table[] = [makeTable()],
) {
  return {
    findById: vi.fn(async () => findById),
    findByNumber: vi.fn(async () => findByNumber),
    findAll: vi.fn(async () => findAll),
    saveTable: vi.fn(async () => undefined),
    deleteTable: vi.fn(async () => undefined),
  } as unknown as ITablesRepository;
}

function makeOrdersRepository(
  openOrders: Array<{
    getTableId: () => string;
    getId: () => string;
    totalPrice: number;
  }> = [],
  exists = false,
) {
  return {
    findAllOpen: vi.fn(async () => openOrders),
    existsOrderForTable: vi.fn(async () => exists),
  } as unknown as IOrdersRepository;
}

describe('CreateTableUseCase', () => {
  it('should persist a new table when the number is free', async () => {
    const repository = makeTablesRepository(null, null, []);
    const useCase = new CreateTableUseCase(repository);

    await useCase.execute({ number: TABLE_NUMBER });

    expect(repository.saveTable).toHaveBeenCalledWith(
      expect.objectContaining({ number: TABLE_NUMBER }),
    );
  });

  it('should refuse a duplicate number', async () => {
    const repository = makeTablesRepository(makeTable(), makeTable());
    const useCase = new CreateTableUseCase(repository);

    await expect(useCase.execute({ number: TABLE_NUMBER })).rejects.toThrow(
      'Table number already exists',
    );
    expect(repository.saveTable).not.toHaveBeenCalled();
  });
});

describe('ListTablesUseCase', () => {
  it('should list tables with no open order', async () => {
    const tablesRepository = makeTablesRepository(null, null, [
      makeTable(),
      Table.create({ id: 'table-2', number: 6 }),
    ]);
    const ordersRepository = makeOrdersRepository();
    const useCase = new ListTablesUseCase(tablesRepository, ordersRepository);

    const listing = await useCase.execute();

    expect(listing).toEqual([
      { id: TABLE_ID, number: TABLE_NUMBER, openOrder: null },
      { id: 'table-2', number: 6, openOrder: null },
    ]);
  });

  it('should carry the open order summary for occupied tables', async () => {
    const tablesRepository = makeTablesRepository();
    const ordersRepository = makeOrdersRepository([
      {
        getTableId: () => TABLE_ID,
        getId: () => 'order-1',
        totalPrice: 90,
      },
    ]);
    const useCase = new ListTablesUseCase(tablesRepository, ordersRepository);

    const listing = await useCase.execute();

    expect(listing).toEqual([
      {
        id: TABLE_ID,
        number: TABLE_NUMBER,
        openOrder: { orderId: 'order-1', totalPrice: 90 },
      },
    ]);
  });
});

describe('RenameTableUseCase', () => {
  it('should renumber a table and persist it', async () => {
    const table = makeTable();
    const repository = makeTablesRepository(table);
    const useCase = new RenameTableUseCase(repository);

    await useCase.execute({ tableId: TABLE_ID, number: 7 });

    expect(table.getNumber()).toBe(7);
    expect(repository.saveTable).toHaveBeenCalledWith(table);
  });

  it('should refuse an unknown table', async () => {
    const repository = makeTablesRepository(null);
    const useCase = new RenameTableUseCase(repository);

    await expect(
      useCase.execute({ tableId: 'unknown', number: 7 }),
    ).rejects.toThrow('Table not found');
    expect(repository.saveTable).not.toHaveBeenCalled();
  });

  it('should refuse a number already used by another table', async () => {
    const repository = makeTablesRepository(
      makeTable(),
      Table.create({ id: 'table-2', number: 7 }),
    );
    const useCase = new RenameTableUseCase(repository);

    await expect(
      useCase.execute({ tableId: TABLE_ID, number: 7 }),
    ).rejects.toThrow('Table number already exists');
    expect(repository.saveTable).not.toHaveBeenCalled();
  });

  it('should allow keeping the same number', async () => {
    const table = makeTable();
    const repository = makeTablesRepository(table, table);
    const useCase = new RenameTableUseCase(repository);

    await useCase.execute({ tableId: TABLE_ID, number: TABLE_NUMBER });

    expect(repository.saveTable).toHaveBeenCalledWith(table);
  });
});

describe('DeleteTableUseCase', () => {
  it('should delete a table without orders', async () => {
    const repository = makeTablesRepository(makeTable());
    const ordersRepository = makeOrdersRepository([], false);
    const useCase = new DeleteTableUseCase(repository, ordersRepository);

    await useCase.execute(TABLE_ID);

    expect(repository.deleteTable).toHaveBeenCalledWith(TABLE_ID);
  });

  it('should refuse an unknown table', async () => {
    const repository = makeTablesRepository(null);
    const ordersRepository = makeOrdersRepository();
    const useCase = new DeleteTableUseCase(repository, ordersRepository);

    await expect(useCase.execute('unknown')).rejects.toThrow('Table not found');
    expect(repository.deleteTable).not.toHaveBeenCalled();
  });

  it('should refuse a table that has orders', async () => {
    const repository = makeTablesRepository(makeTable());
    const ordersRepository = makeOrdersRepository([], true);
    const useCase = new DeleteTableUseCase(repository, ordersRepository);

    await expect(useCase.execute(TABLE_ID)).rejects.toThrow(
      'Cannot delete a table that has orders',
    );
    expect(repository.deleteTable).not.toHaveBeenCalled();
  });
});
