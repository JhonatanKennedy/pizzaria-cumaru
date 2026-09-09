import { Table } from './table.js';

const TABLE_ID = 'table-1';
const TABLE_NUMBER = 5;

function makeTable(): Table {
  return Table.create({ id: TABLE_ID, number: TABLE_NUMBER });
}

describe('Table', () => {
  it('should hold its id and number', () => {
    const table = makeTable();

    expect(table.getId()).toBe(TABLE_ID);
    expect(table.getNumber()).toBe(TABLE_NUMBER);
  });

  it('should reject a number below one', () => {
    expect(() => Table.create({ id: TABLE_ID, number: 0 })).toThrow(
      'Table number must be greater than zero',
    );
  });

  it('should rename to a new valid number', () => {
    const table = makeTable();

    table.rename(7);

    expect(table.getNumber()).toBe(7);
  });

  it('should reject renaming to a number below one', () => {
    const table = makeTable();

    expect(() => table.rename(0)).toThrow(
      'Table number must be greater than zero',
    );
  });
});
