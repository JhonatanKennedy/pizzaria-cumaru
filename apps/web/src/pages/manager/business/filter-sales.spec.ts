import type { TDaySale } from '../api/daily-sales.api';
import {
  categoryQuantities,
  filterDaySales,
  saleTimeOf,
  sortSalesNewestFirst,
} from './filter-sales';
import type { TEnrichedSale } from './enrich-sales';
import { enrichDaySales } from './enrich-sales';

const MENU_IDS = {
  pizza: 'catalog-pizza-1',
  drink: 'catalog-drink-1',
};

function enrich(sales: TDaySale[]): TEnrichedSale[] {
  // No floor listing: the sales below carry no tableId, and these specs are
  // about narrowing, not about the table number a card prints.
  return enrichDaySales(
    sales,
    [
      {
        id: MENU_IDS.pizza,
        name: 'Calabresa',
        description: 'Mussarela e calabresa',
        price: 45,
        category: 'PIZZA',
        requiresPreparation: true,
        available: true,
        ingredientIds: [],
      },
      {
        id: MENU_IDS.drink,
        name: 'Coca-Cola',
        description: 'Lata 350ml',
        price: 8,
        category: 'DRINK',
        requiresPreparation: false,
        available: true,
        ingredientIds: [],
      },
    ],
    [],
  );
}

function makeSale(overrides: Partial<TDaySale>): TDaySale {
  return {
    id: 'sale-1',
    waiterName: 'João Garçom',
    type: 'Local',
    status: 'Closed',
    paymentType: null,
    createdAt: '2026-09-07T14:30:00.000Z',
    closedAt: null,
    deliveredAt: null,
    totalPrice: 0,
    items: [],
    ...overrides,
  };
}

function line(itemId: string, quantity = 1) {
  return { id: `line-${itemId}`, itemId, quantity, status: 'Pending' };
}

const LOCAL_PIX_PIZZA = enrich([
  makeSale({
    id: 'local-pix-pizza',
    paymentType: 'Pix',
    closedAt: '2026-09-07T14:30:00.000Z',
    items: [line(MENU_IDS.pizza, 2)],
  }),
])[0];

const LOCAL_CASH_DRINK = enrich([
  makeSale({
    id: 'local-cash-drink',
    paymentType: 'Cash',
    closedAt: '2026-09-07T15:00:00.000Z',
    items: [line(MENU_IDS.drink, 3)],
  }),
])[0];

const DELIVERY_PIZZA = enrich([
  makeSale({
    id: 'delivery-pizza',
    type: 'Delivery',
    status: 'Delivered',
    deliveredAt: '2026-09-07T19:00:00.000Z',
    items: [line(MENU_IDS.pizza)],
  }),
])[0];

const ALL_SALES = [LOCAL_PIX_PIZZA, LOCAL_CASH_DRINK, DELIVERY_PIZZA];

describe('filterDaySales', () => {
  it('should keep every sale when no filter is set', () => {
    expect(
      filterDaySales(ALL_SALES, {
        type: null,
        payment: null,
        category: null,
      }),
    ).toEqual(ALL_SALES);
  });

  it('should filter by order type', () => {
    expect(
      filterDaySales(ALL_SALES, {
        type: 'Local',
        payment: null,
        category: null,
      }).map((sale) => sale.id),
    ).toEqual(['local-pix-pizza', 'local-cash-drink']);
    expect(
      filterDaySales(ALL_SALES, {
        type: 'Delivery',
        payment: null,
        category: null,
      }).map((sale) => sale.id),
    ).toEqual(['delivery-pizza']);
  });

  it('should filter by payment method', () => {
    expect(
      filterDaySales(ALL_SALES, {
        type: null,
        payment: 'Pix',
        category: null,
      }).map((sale) => sale.id),
    ).toEqual(['local-pix-pizza']);
  });

  it('should never match a delivery sale to a payment filter', () => {
    const deliveryOnly = filterDaySales([DELIVERY_PIZZA], {
      type: null,
      payment: 'Cash',
      category: null,
    });

    expect(deliveryOnly).toEqual([]);
  });

  it('should filter by category over the sale lines', () => {
    expect(
      filterDaySales(ALL_SALES, {
        type: null,
        payment: null,
        category: 'DRINK',
      }).map((sale) => sale.id),
    ).toEqual(['local-cash-drink']);
  });

  it('should combine type, payment and category filters', () => {
    expect(
      filterDaySales(ALL_SALES, {
        type: 'Local',
        payment: null,
        category: 'PIZZA',
      }).map((sale) => sale.id),
    ).toEqual(['local-pix-pizza']);
  });

  it('should never match a line whose item left the menu to a category filter', () => {
    const [removedSale] = enrich([
      makeSale({
        id: 'removed-only',
        closedAt: '2026-09-07T15:30:00.000Z',
        items: [line('gone-item')],
      }),
    ]);

    const matched = filterDaySales([removedSale], {
      type: null,
      payment: null,
      category: 'PIZZA',
    });

    expect(matched).toEqual([]);
  });
});

describe('saleTimeOf / sortSalesNewestFirst', () => {
  it('should use the close time for local sales and the delivery time for delivery sales', () => {
    expect(saleTimeOf(LOCAL_PIX_PIZZA)).toBe('2026-09-07T14:30:00.000Z');
    expect(saleTimeOf(DELIVERY_PIZZA)).toBe('2026-09-07T19:00:00.000Z');
  });

  it('should order the sales newest first', () => {
    expect(sortSalesNewestFirst(ALL_SALES).map((sale) => sale.id)).toEqual([
      'delivery-pizza',
      'local-cash-drink',
      'local-pix-pizza',
    ]);
  });
});

describe('categoryQuantities', () => {
  it('should sum the sold units per category over the given sales', () => {
    const quantities = categoryQuantities([
      LOCAL_PIX_PIZZA,
      LOCAL_CASH_DRINK,
      DELIVERY_PIZZA,
    ]);

    expect(quantities).toEqual([
      { category: 'PIZZA', quantity: 3 },
      { category: 'DISH', quantity: 0 },
      { category: 'DRINK', quantity: 3 },
      { category: 'DESSERT', quantity: 0 },
      { category: 'SIDE', quantity: 0 },
    ]);
  });

  it('should follow the filtered sales', () => {
    const deliveryOnly = filterDaySales([DELIVERY_PIZZA], {
      type: 'Delivery',
      payment: null,
      category: null,
    });

    expect(categoryQuantities(deliveryOnly)).toEqual([
      { category: 'PIZZA', quantity: 1 },
      { category: 'DISH', quantity: 0 },
      { category: 'DRINK', quantity: 0 },
      { category: 'DESSERT', quantity: 0 },
      { category: 'SIDE', quantity: 0 },
    ]);
  });

  it('should count no line whose item left the menu', () => {
    const [removedSale] = enrich([
      makeSale({
        id: 'removed-only',
        closedAt: '2026-09-07T15:30:00.000Z',
        items: [line('gone-item', 4)],
      }),
    ]);

    expect(categoryQuantities([removedSale])).toEqual([
      { category: 'PIZZA', quantity: 0 },
      { category: 'DISH', quantity: 0 },
      { category: 'DRINK', quantity: 0 },
      { category: 'DESSERT', quantity: 0 },
      { category: 'SIDE', quantity: 0 },
    ]);
  });
});
