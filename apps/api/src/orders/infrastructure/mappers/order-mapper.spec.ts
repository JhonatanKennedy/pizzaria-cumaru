import {
  orderRowToDomain,
  orderDomainToCreate,
  orderDomainToUpdate,
} from './order-mapper.js';
import type { TOrderRow } from './order-mapper.js';
import { Order } from '../../domain/entities/orders.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import { EOrderStatus } from '../../domain/enums/order-status.js';
import { EOrderType } from '../../domain/enums/order-type.js';
import { EPaymentType } from '../../domain/enums/payment-type.js';
import { EOrderItemStatus } from '../../domain/enums/order-item-status.js';

// The mapper is the only place a row becomes an aggregate and back, and it
// needs no database to be exercised: every case here builds a row literal or
// an order and reads the result. It is also where the untrusted columns are
// guarded, so the refusals are the point as much as the mappings — a status
// the domain does not know must stop here rather than reach an aggregate.

const ORDER_ID = 'order-1';
const USER_ID = 1;
const TABLE_ID = '3';

const CREATED_AT = new Date(2026, 8, 7, 12);
const LATER_AT = new Date(2026, 8, 7, 12, 5);
const CANCELLED_AT = new Date(2026, 8, 7, 12, 30);
const CLOSED_AT = new Date(2026, 8, 7, 14);

const PIZZA_PRICE = 45;

const NOTES = 'Sem cebola';

type TItemRow = TOrderRow['items'][number];
type TCancellationRow = TOrderRow['cancellations'][number];

function makeItemRow(overrides: Partial<TItemRow> = {}): TItemRow {
  return {
    id: 'order-item-1',
    orderId: ORDER_ID,
    itemId: 'catalog-item-1',
    unitPrice: PIZZA_PRICE,
    quantity: 1,
    status: EOrderItemStatus.PENDING,
    requiresPreparation: true,
    flavors: [],
    notes: null,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function makeCancellationRow(
  overrides: Partial<TCancellationRow> = {},
): TCancellationRow {
  return {
    id: 'cancellation-1',
    orderId: ORDER_ID,
    itemId: 'order-item-1',
    cancelledAt: CANCELLED_AT,
    ...overrides,
  };
}

function makeRow(overrides: Partial<TOrderRow> = {}): TOrderRow {
  return {
    id: ORDER_ID,
    userId: USER_ID,
    type: EOrderType.LOCAL,
    status: EOrderStatus.OPEN,
    paymentType: null,
    tableId: null,
    customerName: null,
    phone: null,
    address: null,
    notes: null,
    createdAt: CREATED_AT,
    deliveredAt: null,
    closedAt: null,
    cancelledAt: null,
    items: [],
    cancellations: [],
    ...overrides,
  };
}

function makeItem(id = 'order-item-1', createdAt = CREATED_AT): OrderItems {
  return OrderItems.create({
    id,
    orderId: ORDER_ID,
    itemId: 'catalog-item-1',
    unitPrice: PIZZA_PRICE,
    quantity: 1,
    requiresPreparation: true,
    createdAt,
  });
}

function makeOrder(notes?: string): Order {
  return Order.create({
    id: ORDER_ID,
    userId: USER_ID,
    type: EOrderType.LOCAL,
    paymentType: EPaymentType.CASH,
    createdAt: CREATED_AT,
    tableId: TABLE_ID,
    notes,
  });
}

describe('orderRowToDomain', () => {
  it('should rehydrate every column the aggregate carries', () => {
    const row = makeRow({
      status: EOrderStatus.CLOSED,
      paymentType: EPaymentType.PIX,
      tableId: TABLE_ID,
      customerName: 'Ana',
      phone: '81999999999',
      address: 'Rua 1',
      notes: NOTES,
      closedAt: CLOSED_AT,
    });

    const order = orderRowToDomain(row);

    expect(order.getId()).toBe(ORDER_ID);
    expect(order.getUserId()).toBe(USER_ID);
    expect(order.getType()).toBe(EOrderType.LOCAL);
    expect(order.getStatus()).toBe(EOrderStatus.CLOSED);
    expect(order.getPaymentType()).toBe(EPaymentType.PIX);
    expect(order.getTableId()).toBe(TABLE_ID);
    expect(order.getCustomerName()).toBe('Ana');
    expect(order.getPhone()).toBe('81999999999');
    expect(order.getAddress()).toBe('Rua 1');
    expect(order.getNotes()).toBe(NOTES);
    expect(order.getCreatedAt()).toEqual(CREATED_AT);
    expect(order.getClosedAt()).toEqual(CLOSED_AT);
  });

  it('should read the absent columns as absent rather than as null', () => {
    const order = orderRowToDomain(makeRow());

    expect(order.getPaymentType()).toBeUndefined();
    expect(order.getTableId()).toBeUndefined();
    expect(order.getCustomerName()).toBeUndefined();
    expect(order.getPhone()).toBeUndefined();
    expect(order.getAddress()).toBeUndefined();
    expect(order.getDeliveredAt()).toBeUndefined();
    expect(order.getClosedAt()).toBeUndefined();
    expect(order.getCancelledAt()).toBeUndefined();
    expect(order.getNotes()).toBe('');
  });

  it('should read a null item status as an item with no kitchen status', () => {
    const row = makeRow({
      items: [makeItemRow({ status: null, requiresPreparation: false })],
    });

    const [item] = orderRowToDomain(row).getItems();

    expect(item.getStatus()).toBeUndefined();
  });

  it('should order the items by when they were created, oldest first', () => {
    const row = makeRow({
      items: [
        makeItemRow({ id: 'later', createdAt: LATER_AT }),
        makeItemRow({ id: 'earlier', createdAt: CREATED_AT }),
      ],
    });

    const items = orderRowToDomain(row).getItems();

    expect(items.map((item) => item.getId())).toEqual(['earlier', 'later']);
  });

  it('should carry the cancellation history over', () => {
    const row = makeRow({ cancellations: [makeCancellationRow()] });

    const order = orderRowToDomain(row);

    expect(order.getCancellationHistory()).toEqual([
      { itemId: 'order-item-1', cancelledAt: CANCELLED_AT },
    ]);
  });
});

describe('orderRowToDomain — the flavors column', () => {
  it('should map a composed pizza onto the item parts', () => {
    const row = makeRow({
      items: [
        makeItemRow({
          flavors: [
            { name: 'Mussarela G', pieces: 6 },
            { name: 'Chocolate G', pieces: 2 },
          ],
        }),
      ],
    });

    const [item] = orderRowToDomain(row).getItems();

    expect(item.getParts()).toEqual([
      { name: 'Mussarela G', pieces: 6 },
      { name: 'Chocolate G', pieces: 2 },
    ]);
  });

  it('should read an empty flavors array as a plain item', () => {
    const row = makeRow({ items: [makeItemRow({ flavors: [] })] });

    const [item] = orderRowToDomain(row).getItems();

    expect(item.getParts()).toEqual([]);
  });

  it.each([
    ['a string', 'Mussarela G'],
    ['a number', 42],
    ['null', null],
    ['an object', { name: 'Mussarela G', pieces: 8 }],
  ])('should refuse a flavors column holding %s', (_label, flavors) => {
    const row = makeRow({ items: [makeItemRow({ flavors })] });

    expect(() => orderRowToDomain(row)).toThrow(
      'Invalid flavor parts on order item',
    );
  });

  it.each([
    ['a part that is not an object', ['Mussarela G']],
    ['a part with no name', [{ pieces: 8 }]],
    ['a part whose name is not a string', [{ name: 8, pieces: 8 }]],
    ['a part with no pieces', [{ name: 'Mussarela G' }]],
    [
      'a part whose pieces are fractional',
      [{ name: 'Mussarela G', pieces: 1.5 }],
    ],
    ['a part occupying no fatias', [{ name: 'Mussarela G', pieces: 0 }]],
    ['a part occupying negative fatias', [{ name: 'Mussarela G', pieces: -1 }]],
    [
      'a well-formed part beside a broken one',
      [
        { name: 'Mussarela G', pieces: 6 },
        { name: 'Chocolate G', pieces: 0 },
      ],
    ],
  ])('should refuse an array holding %s', (_label, flavors) => {
    const row = makeRow({ items: [makeItemRow({ flavors })] });

    expect(() => orderRowToDomain(row)).toThrow(
      'Invalid flavor parts on order item',
    );
  });
});

describe('orderRowToDomain — the columns the domain narrows', () => {
  it.each([
    ['status', { status: 'Waiting' }, 'Unknown order status: Waiting'],
    ['type', { type: 'Takeaway' }, 'Unknown order type: Takeaway'],
    [
      'payment type',
      { paymentType: 'Bitcoin' },
      'Unknown payment type: Bitcoin',
    ],
  ])('should refuse an unknown %s', (_label, override, message) => {
    expect(() => orderRowToDomain(makeRow(override))).toThrow(message);
  });

  it('should refuse an unknown item status', () => {
    const row = makeRow({ items: [makeItemRow({ status: 'Burnt' })] });

    expect(() => orderRowToDomain(row)).toThrow(
      'Unknown order item status: Burnt',
    );
  });
});

describe('orderDomainToCreate', () => {
  it('should write every scalar the aggregate holds, ids and instants included', () => {
    const order = makeOrder(NOTES);
    order.addItem(makeItem());

    expect(orderDomainToCreate(order)).toEqual({
      id: ORDER_ID,
      userId: USER_ID,
      type: EOrderType.LOCAL,
      status: EOrderStatus.OPEN,
      paymentType: EPaymentType.CASH,
      tableId: TABLE_ID,
      customerName: null,
      phone: null,
      address: null,
      notes: NOTES,
      createdAt: CREATED_AT,
      deliveredAt: null,
      closedAt: null,
      cancelledAt: null,
      items: {
        create: [
          {
            id: 'order-item-1',
            itemId: 'catalog-item-1',
            unitPrice: PIZZA_PRICE,
            quantity: 1,
            status: EOrderItemStatus.PENDING,
            requiresPreparation: true,
            flavors: [],
            notes: null,
            createdAt: CREATED_AT,
          },
        ],
      },
      cancellations: { create: [] },
    });
  });

  it('should write an absent note as null rather than as an empty string', () => {
    const create = orderDomainToCreate(makeOrder());

    expect(create.notes).toBeNull();
  });

  it('should write the composed parts and the item note it carries', () => {
    const order = makeOrder();
    order.addItem(
      OrderItems.create({
        id: 'composed-1',
        orderId: ORDER_ID,
        itemId: 'catalog-item-1',
        unitPrice: PIZZA_PRICE,
        quantity: 1,
        requiresPreparation: true,
        createdAt: CREATED_AT,
        parts: [{ name: 'Mussarela G', pieces: 8 }],
        notes: NOTES,
      }),
    );

    const item = orderDomainToCreate(order).items?.create;

    expect(item).toEqual([
      expect.objectContaining({
        flavors: [{ name: 'Mussarela G', pieces: 8 }],
        notes: NOTES,
      }),
    ]);
  });

  it('should write the cancellations it recorded', () => {
    const order = makeOrder();
    order.addItem(makeItem('doomed'));
    order.cancelItem('doomed', CANCELLED_AT);

    const create = orderDomainToCreate(order);

    expect(create.cancellations).toEqual({
      create: [{ itemId: 'doomed', cancelledAt: CANCELLED_AT }],
    });
    expect(create.items).toEqual({ create: [] });
  });
});

describe('orderDomainToUpdate', () => {
  it('should replace the item and cancellation sets wholesale', () => {
    const order = makeOrder(NOTES);
    order.addItem(makeItem());
    order.addItem(makeItem('doomed', LATER_AT));
    order.cancelItem('doomed', CANCELLED_AT);

    expect(orderDomainToUpdate(order)).toEqual({
      status: EOrderStatus.OPEN,
      paymentType: EPaymentType.CASH,
      notes: NOTES,
      deliveredAt: null,
      closedAt: null,
      cancelledAt: null,
      items: {
        deleteMany: {},
        create: [
          {
            id: 'order-item-1',
            itemId: 'catalog-item-1',
            unitPrice: PIZZA_PRICE,
            quantity: 1,
            status: EOrderItemStatus.PENDING,
            requiresPreparation: true,
            flavors: [],
            notes: null,
            createdAt: CREATED_AT,
          },
        ],
      },
      cancellations: {
        deleteMany: {},
        create: [{ itemId: 'doomed', cancelledAt: CANCELLED_AT }],
      },
    });
  });

  it('should carry the close onto the row', () => {
    const order = makeOrder();
    order.addItem(makeItem());
    order.close(EPaymentType.PIX, CLOSED_AT);

    const update = orderDomainToUpdate(order);

    expect(update.status).toBe(EOrderStatus.CLOSED);
    expect(update.paymentType).toBe(EPaymentType.PIX);
    expect(update.closedAt).toEqual(CLOSED_AT);
  });
});
