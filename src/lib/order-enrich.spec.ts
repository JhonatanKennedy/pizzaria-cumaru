import type { TMenuListing } from '@api/catalog.api';
import type { TOrderListing } from '@api/orders.api';
import { REMOVED_ITEM_LABEL } from './catalog';
import { enrichOrder } from './order-enrich';

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
    {
      id: 'line-1',
      itemId: 'catalog-pizza-1',
      quantity: 2,
      status: 'Pending',
      unitPrice: 52,
      parts: [
        { name: 'Calabresa G', pieces: 6 },
        { name: 'Chocolate G', pieces: 2 },
      ],
    },
    {
      id: 'line-2',
      itemId: 'catalog-removed-1',
      quantity: 1,
      status: null,
      unitPrice: 30,
      parts: [],
    },
  ],
};

describe('enrichOrder', () => {
  it('should join each line with its menu item name', () => {
    const enriched = enrichOrder(ORDER, MENU);

    expect(enriched.items[0].name).toBe('Calabresa');
  });

  it('should keep the recorded unit price instead of the catalog price', () => {
    const enriched = enrichOrder(ORDER, MENU);

    expect(enriched.items[0].unitPrice).toBe(52);
  });

  it('should keep the recorded parts and quantity on each line', () => {
    const enriched = enrichOrder(ORDER, MENU);

    expect(enriched.items[0].parts).toEqual([
      { name: 'Calabresa G', pieces: 6 },
      { name: 'Chocolate G', pieces: 2 },
    ]);
    expect(enriched.items[0].quantity).toBe(2);
  });

  it('should show the fallback label with the recorded price for removed menu items', () => {
    const enriched = enrichOrder(ORDER, MENU);

    expect(enriched.items[1].name).toBe(REMOVED_ITEM_LABEL);
    expect(enriched.items[1].unitPrice).toBe(30);
  });

  it('should keep the order totals untouched', () => {
    const enriched = enrichOrder(ORDER, MENU);

    expect(enriched.totalPrice).toBe(90);
    expect(enriched.tableId).toBe('5');
  });

  it('should fall back for every name when the menu is empty', () => {
    const enriched = enrichOrder(ORDER, []);

    expect(
      enriched.items.every((item) => item.name === REMOVED_ITEM_LABEL),
    ).toBe(true);
  });

  it('should keep the delivery fields untouched', () => {
    const enriched = enrichOrder(
      {
        ...ORDER,
        type: 'Delivery',
        customerName: 'Maria Souza',
        phone: '(81) 99999-0000',
        address: 'Rua A, 10',
        deliveredAt: '2026-09-09T15:30:00Z',
      },
      MENU,
    );

    expect(enriched.customerName).toBe('Maria Souza');
    expect(enriched.phone).toBe('(81) 99999-0000');
    expect(enriched.address).toBe('Rua A, 10');
    expect(enriched.deliveredAt).toBe('2026-09-09T15:30:00Z');
  });
});
