import type { TMenuListing } from '@api/catalog.api';
import type { TOrderListing } from './schemas';
import { REMOVED_ITEM_LABEL, enrichOrder } from './enrich';

const MENU: TMenuListing = [
  {
    id: 'catalog-pizza-1',
    name: 'Calabresa',
    description: 'Mussarela e calabresa',
    price: 45,
    category: 'PIZZA',
    requiresPreparation: true,
    available: true,
  },
];

const ORDER: TOrderListing = {
  id: 'order-1',
  waiterName: 'joao.garcom',
  type: 'Local',
  status: 'Open',
  tableId: '5',
  createdAt: '2026-09-08T12:00:00Z',
  totalPrice: 90,
  items: [
    { id: 'line-1', itemId: 'catalog-pizza-1', quantity: 2, status: 'Pending' },
    { id: 'line-2', itemId: 'catalog-removed-1', quantity: 1, status: null },
  ],
};

describe('enrichOrder', () => {
  it('should join each line with its menu item name and price', () => {
    const enriched = enrichOrder(ORDER, MENU);

    expect(enriched.items[0]).toEqual({
      id: 'line-1',
      itemId: 'catalog-pizza-1',
      quantity: 2,
      status: 'Pending',
      name: 'Calabresa',
      unitPrice: 45,
    });
  });

  it('should show the fallback label and no price for removed menu items', () => {
    const enriched = enrichOrder(ORDER, MENU);

    expect(enriched.items[1].name).toBe(REMOVED_ITEM_LABEL);
    expect(enriched.items[1].unitPrice).toBeNull();
  });

  it('should keep the order totals untouched', () => {
    const enriched = enrichOrder(ORDER, MENU);

    expect(enriched.totalPrice).toBe(90);
    expect(enriched.tableId).toBe('5');
  });

  it('should fall back for every line when the menu is empty', () => {
    const enriched = enrichOrder(ORDER, []);

    expect(
      enriched.items.every((item) => item.name === REMOVED_ITEM_LABEL),
    ).toBe(true);
  });
});
