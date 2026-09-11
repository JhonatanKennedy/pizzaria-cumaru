import { REMOVED_ITEM_LABEL } from '@lib/catalog';
import type { TMenuListing } from '@api/catalog.api';
import type { TTableListing } from '@api/tables.api';
import type { TDaySale } from '../api/daily-sales.api';
import { enrichDaySales } from './enrich-sales';

const TABLES: TTableListing = [
  { id: 'table-uuid-5', number: 5, openOrder: null },
  { id: 'table-uuid-7', number: 7, openOrder: null },
];

// The sale above names its table by the id the floor listing is keyed on, which
// is the shape the wire actually carries — a uuid, never the number.
const SALE_TABLE_ID = 'table-uuid-5';

const MENU: TMenuListing = [
  {
    id: 'catalog-pizza-1',
    name: 'Calabresa',
    description: 'Mussarela e calabresa',
    price: 45,
    category: 'PIZZA',
    requiresPreparation: true,
    available: true,
    ingredientIds: [],
  },
  {
    id: 'catalog-drink-1',
    name: 'Coca-Cola',
    description: 'Lata 350ml',
    price: 8,
    category: 'DRINK',
    requiresPreparation: false,
    available: true,
    ingredientIds: [],
  },
];

const SALE: TDaySale = {
  id: 'sale-local',
  waiterName: 'João Garçom',
  type: 'Local',
  status: 'Closed',
  paymentType: 'Pix',
  tableId: SALE_TABLE_ID,
  createdAt: '2026-09-07T14:30:00.000Z',
  closedAt: '2026-09-07T14:30:00.000Z',
  deliveredAt: null,
  totalPrice: 98,
  items: [
    { id: 'line-1', itemId: 'catalog-pizza-1', quantity: 2, status: 'Pending' },
    { id: 'line-2', itemId: 'catalog-drink-1', quantity: 1, status: 'Pending' },
  ],
};

describe('enrichDaySales', () => {
  it('should attach name, category and unit price from the menu to each line', () => {
    const [sale] = enrichDaySales([SALE], MENU, TABLES);

    expect(sale.items[0]).toEqual({
      ...SALE.items[0],
      name: 'Calabresa',
      category: 'PIZZA',
      unitPrice: 45,
    });
    expect(sale.items[1]).toEqual({
      ...SALE.items[1],
      name: 'Coca-Cola',
      category: 'DRINK',
      unitPrice: 8,
    });
  });

  it('should keep the sale fields untouched', () => {
    const [sale] = enrichDaySales([SALE], MENU, TABLES);

    expect(sale.id).toBe('sale-local');
    expect(sale.waiterName).toBe('João Garçom');
    expect(sale.totalPrice).toBe(98);
    expect(sale.closedAt).toBe(SALE.closedAt);
  });

  it('should label lines whose item left the menu without a category', () => {
    const removedLine = {
      id: 'line-3',
      itemId: 'gone-item',
      quantity: 1,
      status: 'Pending',
    };
    const [sale] = enrichDaySales(
      [{ ...SALE, items: [removedLine] }],
      MENU,
      TABLES,
    );

    expect(sale.items[0]).toEqual({
      ...removedLine,
      name: REMOVED_ITEM_LABEL,
      category: null,
      unitPrice: null,
    });
  });

  it('should resolve a local sale to the number its table carries', () => {
    const [sale] = enrichDaySales([SALE], MENU, TABLES);

    expect(sale.tableNumber).toBe(5);
  });

  it('should leave the number null when the sale names no table', () => {
    const [sale] = enrichDaySales(
      [{ ...SALE, type: 'Delivery', tableId: undefined }],
      MENU,
      TABLES,
    );

    expect(sale.tableNumber).toBeNull();
  });

  it('should leave the number null when the table is not on the floor', () => {
    const [sale] = enrichDaySales(
      [{ ...SALE, tableId: 'table-uuid-gone' }],
      MENU,
      TABLES,
    );

    expect(sale.tableNumber).toBeNull();
  });
});
