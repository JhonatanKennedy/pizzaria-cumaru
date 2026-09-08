import { OrderItems } from './order-items.js';
import { EOrderItemStatus } from '../enums/order-item-status.js';

const UNIT_PRICE = 45;
const ITEM_ID = 'item-1';
const ORDER_ID = 'order-1';
const CATALOG_ITEM_ID = 'catalog-item-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');

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

  it('should throw when cancelling without a reason', () => {
    const item = makePreparedItem();

    expect(() => item.cancel('   ')).toThrow('Cancellation reason is required');
  });

  it('should allow cancelling a Pending prepared item', () => {
    const item = makePreparedItem();

    expect(() => item.cancel('Customer gave up')).not.toThrow();
  });

  it('should refuse cancelling a Preparing item with the spec message', () => {
    const item = makePreparedItem();
    item.startPreparation();

    expect(() => item.cancel('Customer gave up')).toThrow(
      'Cannot cancel an item in preparation',
    );
  });

  it('should refuse cancelling a Ready item', () => {
    const item = makePreparedItem();
    item.startPreparation();
    item.finishPreparation();

    expect(() => item.cancel('Customer gave up')).toThrow(
      'Cannot cancel an item in preparation',
    );
  });

  it('should allow cancelling a non-prepared item regardless of its status', () => {
    const drink = makeDrink();

    expect(() => drink.cancel('Customer gave up')).not.toThrow();
  });

  it('should keep the creation timestamp supplied by the caller', () => {
    const item = makePreparedItem();

    expect(item.getCreatedAt()).toBe(CREATED_AT);
  });

  it('should default to no flavors and record them when given', () => {
    const plain = makePreparedItem();
    const split = OrderItems.create({
      id: 'split-1',
      orderId: ORDER_ID,
      itemId: CATALOG_ITEM_ID,
      unitPrice: 46,
      quantity: 1,
      requiresPreparation: true,
      createdAt: CREATED_AT,
      flavors: ['Calabresa', 'Portuguesa'],
    });

    expect(plain.getFlavors()).toEqual([]);
    expect(split.getFlavors()).toEqual(['Calabresa', 'Portuguesa']);
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
