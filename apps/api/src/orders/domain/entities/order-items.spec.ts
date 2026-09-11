import { OrderItems, isFlavorPart } from './order-items.js';
import type { CreateOrderItemParams, TFlavorPart } from './order-items.js';
import { EOrderItemStatus } from '../enums/order-item-status.js';

const UNIT_PRICE = 45;
const ITEM_ID = 'item-1';
const ORDER_ID = 'order-1';
const CATALOG_ITEM_ID = 'catalog-item-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

function makeCreateParams(
  overrides: Partial<CreateOrderItemParams> = {},
): CreateOrderItemParams {
  return {
    id: ITEM_ID,
    orderId: ORDER_ID,
    itemId: CATALOG_ITEM_ID,
    unitPrice: UNIT_PRICE,
    quantity: 1,
    requiresPreparation: true,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function makePreparedItem(): OrderItems {
  return OrderItems.create({
    id: ITEM_ID,
    orderId: ORDER_ID,
    itemId: CATALOG_ITEM_ID,
    unitPrice: UNIT_PRICE,
    quantity: 1,
    requiresPreparation: true,
    createdAt: CREATED_AT,
  });
}

function makeDrink(): OrderItems {
  return OrderItems.create({
    id: 'drink-1',
    orderId: ORDER_ID,
    itemId: 'catalog-drink-1',
    unitPrice: 8,
    quantity: 1,
    requiresPreparation: false,
    createdAt: CREATED_AT,
  });
}

describe('OrderItems', () => {
  it('should start Pending when it requires preparation', () => {
    const item = makePreparedItem();

    expect(item.getStatus()).toBe(EOrderItemStatus.PENDING);
  });

  it('should have no status when it does not require preparation', () => {
    const drink = makeDrink();

    expect(drink.getStatus()).toBeUndefined();
  });

  it('should transition Pending to Preparing on startPreparation', () => {
    const item = makePreparedItem();

    item.startPreparation();

    expect(item.getStatus()).toBe(EOrderItemStatus.PREPARING);
  });

  it('should throw when starting an item that is not Pending', () => {
    const item = makePreparedItem();
    item.startPreparation();

    expect(() => item.startPreparation()).toThrow(
      'Item is not waiting for preparation',
    );
  });

  it('should throw when starting a non-prepared item', () => {
    const drink = makeDrink();

    expect(() => drink.startPreparation()).toThrow(
      'Item is not waiting for preparation',
    );
  });

  it('should transition Preparing to Ready on finishPreparation', () => {
    const item = makePreparedItem();
    item.startPreparation();

    item.finishPreparation();

    expect(item.getStatus()).toBe(EOrderItemStatus.READY);
  });

  it('should throw when finishing an item that is still Pending', () => {
    const item = makePreparedItem();

    expect(() => item.finishPreparation()).toThrow(
      'Item is not in preparation',
    );
  });

  it('should throw when finishing an item that is already Ready', () => {
    const item = makePreparedItem();
    item.startPreparation();
    item.finishPreparation();

    expect(() => item.finishPreparation()).toThrow(
      'Item is not in preparation',
    );
  });

  it('should allow cancelling a Pending prepared item', () => {
    const item = makePreparedItem();

    expect(() => item.cancel()).not.toThrow();
  });

  it('should refuse cancelling a Preparing item with the spec message', () => {
    const item = makePreparedItem();
    item.startPreparation();

    expect(() => item.cancel()).toThrow('Cannot cancel an item in preparation');
  });

  it('should refuse cancelling a Ready item', () => {
    const item = makePreparedItem();
    item.startPreparation();
    item.finishPreparation();

    expect(() => item.cancel()).toThrow('Cannot cancel an item in preparation');
  });

  it('should allow cancelling a non-prepared item regardless of its status', () => {
    const drink = makeDrink();

    expect(() => drink.cancel()).not.toThrow();
  });

  it('should allow cancelling the preparation of an item in preparation', () => {
    const item = makePreparedItem();
    item.startPreparation();

    expect(() => item.cancelPreparation()).not.toThrow();
  });

  it('should refuse cancelPreparation while the item is Pending', () => {
    const item = makePreparedItem();

    expect(() => item.cancelPreparation()).toThrow(
      'Cannot cancel an item not in preparation',
    );
  });

  it('should refuse cancelPreparation once the item is Ready', () => {
    const item = makePreparedItem();
    item.startPreparation();
    item.finishPreparation();

    expect(() => item.cancelPreparation()).toThrow(
      'Cannot cancel an item not in preparation',
    );
  });

  it('should refuse cancelPreparation on a non-prepared item', () => {
    const drink = makeDrink();

    expect(() => drink.cancelPreparation()).toThrow(
      'Cannot cancel an item not in preparation',
    );
  });

  it('should keep the creation timestamp supplied by the caller', () => {
    const item = makePreparedItem();

    expect(item.getCreatedAt()).toBe(CREATED_AT);
  });

  it.each([0, -1])(
    'should refuse creating an item with a quantity of %i',
    (quantity) => {
      expect(() => OrderItems.create(makeCreateParams({ quantity }))).toThrow(
        'Quantity must be greater than zero',
      );
    },
  );

  it('should refuse creating an item with a negative unit price', () => {
    expect(() =>
      OrderItems.create(makeCreateParams({ unitPrice: -1 })),
    ).toThrow('Unit price cannot be negative');
  });

  it('should accept an item that costs nothing', () => {
    const item = OrderItems.create(makeCreateParams({ unitPrice: 0 }));

    expect(item.getUnitPrice()).toBe(0);
  });

  it('should increase the quantity of a Pending item', () => {
    const item = makePreparedItem();

    item.increaseQuantity(2);

    expect(item.getQuantity()).toBe(3);
  });

  it('should increase the quantity of an item in preparation', () => {
    const item = makePreparedItem();
    item.startPreparation();

    item.increaseQuantity(1);

    expect(item.getQuantity()).toBe(2);
  });

  it('should increase a non-prepared item that never entered the kitchen', () => {
    const drink = makeDrink();

    drink.increaseQuantity(3);

    expect(drink.getQuantity()).toBe(4);
  });

  it('should refuse increasing a Ready item', () => {
    const item = makePreparedItem();
    item.startPreparation();
    item.finishPreparation();

    expect(() => item.increaseQuantity(1)).toThrow(
      'Cannot change a ready item',
    );
  });

  it('should keep the quantity when a Ready increase is refused', () => {
    const item = makePreparedItem();
    item.startPreparation();
    item.finishPreparation();

    expect(() => item.increaseQuantity(1)).toThrow();
    expect(item.getQuantity()).toBe(1);
  });

  it('should still decrease a Ready item', () => {
    const item = makePreparedItem();
    item.increaseQuantity(1);
    item.startPreparation();
    item.finishPreparation();

    item.decreaseQuantity(1);

    expect(item.getQuantity()).toBe(1);
  });

  it.each([0, -1])('should refuse increasing by %i', (quantity) => {
    const item = makePreparedItem();

    expect(() => item.increaseQuantity(quantity)).toThrow(
      'Quantity must be greater than zero',
    );
    expect(item.getQuantity()).toBe(1);
  });

  it.each([0, -1])('should refuse decreasing by %i', (quantity) => {
    const item = makePreparedItem();

    expect(() => item.decreaseQuantity(quantity)).toThrow(
      'Quantity must be greater than zero',
    );
    expect(item.getQuantity()).toBe(1);
  });

  it('should refuse decreasing all the way to nothing', () => {
    const item = makePreparedItem();
    item.increaseQuantity(1);

    expect(() => item.decreaseQuantity(2)).toThrow(
      'Quantity cannot be less than one',
    );
    expect(item.getQuantity()).toBe(2);
  });

  it('should default to no parts and record a whole-canvas or composed pizza when given', () => {
    const plain = makePreparedItem();
    const whole = OrderItems.create({
      id: 'whole-1',
      orderId: ORDER_ID,
      itemId: CATALOG_ITEM_ID,
      unitPrice: 45,
      quantity: 1,
      requiresPreparation: true,
      createdAt: CREATED_AT,
      parts: [{ name: 'Mussarela G', pieces: 8 }],
    });
    const split = OrderItems.create({
      id: 'split-1',
      orderId: ORDER_ID,
      itemId: CATALOG_ITEM_ID,
      unitPrice: 46,
      quantity: 1,
      requiresPreparation: true,
      createdAt: CREATED_AT,
      parts: [
        { name: 'Mussarela G', pieces: 6 },
        { name: 'Chocolate G', pieces: 2 },
      ],
    });

    expect(plain.getParts()).toEqual([]);
    expect(whole.getParts()).toEqual([{ name: 'Mussarela G', pieces: 8 }]);
    expect(split.getParts()).toEqual([
      { name: 'Mussarela G', pieces: 6 },
      { name: 'Chocolate G', pieces: 2 },
    ]);
  });

  it('should hand out part copies so callers cannot mutate the record', () => {
    const split = OrderItems.create({
      id: 'split-2',
      orderId: ORDER_ID,
      itemId: CATALOG_ITEM_ID,
      unitPrice: 46,
      quantity: 1,
      requiresPreparation: true,
      createdAt: CREATED_AT,
      parts: [
        { name: 'Mussarela G', pieces: 6 },
        { name: 'Chocolate G', pieces: 2 },
      ],
    });

    // The readonly type is the first line of defence and the compiler proves
    // it; the cast is deliberate, to show the copy underneath holds even for
    // a caller who goes around the type.
    const parts = split.getParts() as TFlavorPart[];
    parts[0] = { name: 'Tampered', pieces: 0 };
    (parts[1] as { pieces: number }).pieces = 0;

    expect(split.getParts()).toEqual([
      { name: 'Mussarela G', pieces: 6 },
      { name: 'Chocolate G', pieces: 2 },
    ]);
  });

  it('should record and expose the item notes', () => {
    const item = OrderItems.create({
      id: 'item-2',
      orderId: ORDER_ID,
      itemId: CATALOG_ITEM_ID,
      unitPrice: UNIT_PRICE,
      quantity: 1,
      requiresPreparation: true,
      createdAt: CREATED_AT,
      notes: 'no onions, stuffed crust',
    });

    expect(item.getNotes()).toBe('no onions, stuffed crust');
    expect(makePreparedItem().getNotes()).toBe('');
  });
});

// The predicate backs the guard on the `flavors` JSON column, so it meets
// values no type system has seen: each rejection below is a row that would
// otherwise reach the aggregate as a composition.
describe('isFlavorPart', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'Mussarela G'],
    ['a number', 8],
    ['an array', [{ name: 'Mussarela G', pieces: 8 }]],
  ])('should refuse %s', (_label, value) => {
    expect(isFlavorPart(value)).toBe(false);
  });

  it.each([
    ['no name', { pieces: 8 }],
    ['a name that is not a string', { name: 8, pieces: 8 }],
    ['a null name', { name: null, pieces: 8 }],
    ['no pieces', { name: 'Mussarela G' }],
    ['pieces that are not a number', { name: 'Mussarela G', pieces: '8' }],
    ['fractional pieces', { name: 'Mussarela G', pieces: 1.5 }],
    ['no fatias', { name: 'Mussarela G', pieces: 0 }],
    ['negative fatias', { name: 'Mussarela G', pieces: -1 }],
  ])('should refuse a part with %s', (_label, value) => {
    expect(isFlavorPart(value)).toBe(false);
  });

  it('should accept a flavor and the fatias it occupies', () => {
    expect(isFlavorPart({ name: 'Mussarela G', pieces: 6 })).toBe(true);
  });

  it('should ignore anything beyond the flavor and its fatias', () => {
    const part: TFlavorPart = { name: 'Mussarela G', pieces: 6 };

    expect(isFlavorPart({ ...part, price: 45 })).toBe(true);
  });
});
