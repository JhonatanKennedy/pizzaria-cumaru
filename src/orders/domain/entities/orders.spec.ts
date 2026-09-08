import { Order } from './orders.js';
import { OrderItems } from './order-items.js';
import { EOrderStatus } from '../enums/order-status.js';
import { EOrderType } from '../enums/order-type.js';
import { EPaymentType } from '../enums/payment-type.js';

const PIZZA_PRICE = 45;
const WATER_PRICE = 8;
const ORDER_ID = 'order-1';
const USER_ID = 1;
const CATALOG_ITEM_ID = 'catalog-item-1';
const CREATED_AT = new Date('2026-09-07T12:00:00Z');
const CANCELLED_AT = new Date('2026-09-07T12:30:00Z');

function makeOrder(): Order {
  return Order.create({
    id: ORDER_ID,
    userId: USER_ID,
    type: EOrderType.LOCAL,
    paymentType: EPaymentType.CASH,
    createdAt: CREATED_AT,
  });
}

function makeDeliveryOrder(): Order {
  return Order.create({
    id: 'delivery-1',
    userId: USER_ID,
    type: EOrderType.DELIVERY,
    createdAt: CREATED_AT,
    customerName: 'Maria Souza',
    address: 'Rua A',
  });
}

function makeItem(unitPrice: number, quantity = 1): OrderItems {
  return OrderItems.create({
    id: `item-${unitPrice}`,
    orderId: ORDER_ID,
    itemId: CATALOG_ITEM_ID,
    unitPrice,
    quantity,
    requiresPreparation: true,
    createdAt: CREATED_AT,
  });
}

function makeDrink(): OrderItems {
  return OrderItems.create({
    id: 'drink-1',
    orderId: ORDER_ID,
    itemId: 'catalog-drink-1',
    unitPrice: WATER_PRICE,
    quantity: 1,
    requiresPreparation: false,
    createdAt: CREATED_AT,
  });
}

describe('Order', () => {
  it('should start OPEN with a total of zero', () => {
    const order = makeOrder();

    expect(order.getStatus()).toBe(EOrderStatus.OPEN);
    expect(order.totalPrice).toBe(0);
  });

  it('should sum the total price of its items', () => {
    const order = makeOrder();
    order.addItem(makeItem(PIZZA_PRICE));
    order.addItem(makeItem(WATER_PRICE, 2));

    expect(order.totalPrice).toBe(PIZZA_PRICE + WATER_PRICE * 2);
  });

  it('should throw when adding an item to a closed order', () => {
    const order = makeOrder();
    order.addItem(makeItem(PIZZA_PRICE));
    order.close(EPaymentType.CASH, CANCELLED_AT);

    expect(() => order.addItem(makeItem(WATER_PRICE))).toThrow(
      'Cannot change a closed order',
    );
  });

  it('should throw when closing an order with no items', () => {
    const order = makeOrder();

    expect(() => order.close(EPaymentType.CASH, CANCELLED_AT)).toThrow(
      'Order must have at least one item',
    );
  });

  it('should record the payment method and closing time when closed', () => {
    const order = makeOrder();
    order.addItem(makeItem(PIZZA_PRICE));

    order.close(EPaymentType.CREDIT_CARD, CANCELLED_AT);

    expect(order.getStatus()).toBe(EOrderStatus.CLOSED);
    expect(order.getPaymentType()).toBe(EPaymentType.CREDIT_CARD);
    expect(order.getClosedAt()).toBe(CANCELLED_AT);
  });

  it('should refuse closing an already closed order', () => {
    const order = makeOrder();
    order.addItem(makeItem(PIZZA_PRICE));
    order.close(EPaymentType.CASH, CANCELLED_AT);

    expect(() => order.close(EPaymentType.CASH, CANCELLED_AT)).toThrow(
      'Order is already closed',
    );
  });

  it('should remove a cancelled item and record the reason in history', () => {
    const order = makeOrder();
    order.addItem(makeItem(PIZZA_PRICE));
    order.addItem(makeDrink());

    order.cancelItem('drink-1', 'Customer gave up', CANCELLED_AT);

    expect(order.getItems()).toHaveLength(1);
    expect(order.getCancellationHistory()).toEqual([
      {
        itemId: 'drink-1',
        reason: 'Customer gave up',
        cancelledAt: CANCELLED_AT,
      },
    ]);
  });

  it('should record each cancellation with its reason and time', () => {
    const order = makeOrder();
    const pizza = makeItem(PIZZA_PRICE);
    const water = makeItem(WATER_PRICE);
    order.addItem(pizza);
    order.addItem(water);

    order.cancelItem(pizza.getId(), 'Customer gave up', CANCELLED_AT);
    order.cancelItem(water.getId(), 'Wrong order', CANCELLED_AT);

    expect(order.getCancellationHistory()).toEqual([
      {
        itemId: pizza.getId(),
        reason: 'Customer gave up',
        cancelledAt: CANCELLED_AT,
      },
      {
        itemId: water.getId(),
        reason: 'Wrong order',
        cancelledAt: CANCELLED_AT,
      },
    ]);
    expect(order.getItems()).toHaveLength(0);
  });

  it('should refuse cancelling an item in preparation', () => {
    const order = makeOrder();
    const pizza = makeItem(PIZZA_PRICE);
    order.addItem(pizza);
    pizza.startPreparation();

    expect(() =>
      order.cancelItem(pizza.getId(), 'Customer gave up', CANCELLED_AT),
    ).toThrow('Cannot cancel an item in preparation');
    expect(order.getItems()).toHaveLength(1);
    expect(order.getCancellationHistory()).toHaveLength(0);
  });

  it('should cancel a non-prepared item regardless of the progress of other items', () => {
    const order = makeOrder();
    const pizza = makeItem(PIZZA_PRICE);
    const drink = makeDrink();
    order.addItem(pizza);
    order.addItem(drink);
    pizza.startPreparation();

    order.cancelItem(drink.getId(), 'Customer gave up', CANCELLED_AT);

    expect(order.getItems()).toHaveLength(1);
    expect(order.getCancellationHistory()).toHaveLength(1);
  });

  it('should cancel an item in preparation and leave the rest of the order untouched', () => {
    const order = makeOrder();
    const pizza = makeItem(PIZZA_PRICE);
    const drink = makeDrink();
    order.addItem(pizza);
    order.addItem(drink);
    pizza.startPreparation();

    order.cancelPreparationItem(
      pizza.getId(),
      'Wrong dish started',
      CANCELLED_AT,
    );

    expect(order.getItems()).toHaveLength(1);
    expect(order.getItems()[0].getId()).toBe(drink.getId());
    expect(order.getCancellationHistory()).toEqual([
      {
        itemId: pizza.getId(),
        reason: 'Wrong dish started',
        cancelledAt: CANCELLED_AT,
      },
    ]);
    expect(order.getStatus()).toBe(EOrderStatus.OPEN);
    expect(order.totalPrice).toBe(WATER_PRICE);
  });

  it('should refuse cancelling the preparation of an item of a closed order', () => {
    const order = makeOrder();
    const pizza = makeItem(PIZZA_PRICE);
    order.addItem(pizza);
    pizza.startPreparation();
    order.close(EPaymentType.CASH, CANCELLED_AT);

    expect(() =>
      order.cancelPreparationItem(
        pizza.getId(),
        'Wrong dish started',
        CANCELLED_AT,
      ),
    ).toThrow('Cannot change a closed order');
  });

  it('should throw when cancelling the preparation of an item that is not in the order', () => {
    const order = makeOrder();

    expect(() =>
      order.cancelPreparationItem(
        'unknown-item',
        'Wrong dish started',
        CANCELLED_AT,
      ),
    ).toThrow('Item not found');
  });

  it('should refuse cancelling an item of a closed order', () => {
    const order = makeOrder();
    const pizza = makeItem(PIZZA_PRICE);
    order.addItem(pizza);
    order.close(EPaymentType.CASH, CANCELLED_AT);

    expect(() =>
      order.cancelItem(pizza.getId(), 'Customer gave up', CANCELLED_AT),
    ).toThrow('Cannot change a closed order');
  });

  it('should throw when cancelling an item that is not in the order', () => {
    const order = makeOrder();

    expect(() =>
      order.cancelItem('unknown-item', 'Customer gave up', CANCELLED_AT),
    ).toThrow('Item not found');
  });

  it('should keep the creation timestamp supplied by the caller', () => {
    const order = makeOrder();

    expect(order.getCreatedAt()).toBe(CREATED_AT);
  });

  it('should refuse a delivery order without a customer name', () => {
    expect(() =>
      Order.create({
        id: 'delivery-1',
        userId: USER_ID,
        type: EOrderType.DELIVERY,
        createdAt: CREATED_AT,
        address: 'Rua A',
      }),
    ).toThrow('Customer name is required for delivery');
  });

  it('should refuse a delivery order without an address', () => {
    expect(() =>
      Order.create({
        id: 'delivery-1',
        userId: USER_ID,
        type: EOrderType.DELIVERY,
        createdAt: CREATED_AT,
        customerName: 'Maria Souza',
      }),
    ).toThrow('Delivery address is required for delivery');
  });

  it('should store the delivery data and make it readable', () => {
    const order = makeDeliveryOrder();

    expect(order.getCustomerName()).toBe('Maria Souza');
    expect(order.getAddress()).toBe('Rua A');
  });

  it('should create a local order without a payment method', () => {
    const order = Order.create({
      id: ORDER_ID,
      userId: USER_ID,
      type: EOrderType.LOCAL,
      createdAt: CREATED_AT,
    });

    expect(order.getPaymentType()).toBeUndefined();
  });
});

describe('Order delivery cycle', () => {
  it('should walk the full delivery cycle and record the delivery time', () => {
    const order = makeDeliveryOrder();
    const deliveredAt = new Date('2026-09-07T13:00:00Z');

    order.startDeliveryPreparation();
    expect(order.getStatus()).toBe(EOrderStatus.PREPARING);

    order.sendOutForDelivery();
    expect(order.getStatus()).toBe(EOrderStatus.OUT_FOR_DELIVERY);

    order.markDelivered(deliveredAt);
    expect(order.getStatus()).toBe(EOrderStatus.DELIVERED);
    expect(order.getDeliveredAt()).toBe(deliveredAt);
  });

  it('should refuse skipping a step in the cycle', () => {
    const order = makeDeliveryOrder();

    expect(() => order.markDelivered(CANCELLED_AT)).toThrow(
      'Invalid delivery status transition',
    );
  });

  it('should refuse moving a delivered order backwards', () => {
    const order = makeDeliveryOrder();
    order.startDeliveryPreparation();
    order.sendOutForDelivery();
    order.markDelivered(CANCELLED_AT);

    expect(() => order.sendOutForDelivery()).toThrow(
      'Invalid delivery status transition',
    );
  });

  it('should refuse the delivery cycle for local orders', () => {
    const order = makeOrder();

    expect(() => order.startDeliveryPreparation()).toThrow(
      'Only delivery orders can enter the delivery cycle',
    );
  });

  it('should refuse repeating a step', () => {
    const order = makeDeliveryOrder();
    order.startDeliveryPreparation();

    expect(() => order.startDeliveryPreparation()).toThrow(
      'Invalid delivery status transition',
    );
  });
});
