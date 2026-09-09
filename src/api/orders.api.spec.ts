import { orderListingSchema } from './orders.api';

const VALID_LOCAL_ORDER = {
  id: 'order-1',
  waiterName: 'joao.garcom',
  type: 'Local',
  status: 'Open',
  tableId: '5',
  createdAt: '2026-09-08T12:00:00Z',
  totalPrice: 90,
  items: [
    { id: 'line-1', itemId: 'catalog-pizza-1', quantity: 2, status: 'Pending' },
    { id: 'line-2', itemId: 'catalog-drink-1', quantity: 1, status: null },
  ],
};

const DELIVERY_FIELDS = {
  customerName: 'Maria Souza',
  phone: '(81) 99999-0000',
  address: 'Rua A, 10',
};

describe('orderListingSchema', () => {
  it('should accept a local order without delivery fields', () => {
    expect(orderListingSchema.safeParse(VALID_LOCAL_ORDER).success).toBe(true);
  });

  it('should accept a delivery order carrying its customer fields', () => {
    expect(
      orderListingSchema.safeParse({
        ...VALID_LOCAL_ORDER,
        type: 'Delivery',
        ...DELIVERY_FIELDS,
      }).success,
    ).toBe(true);
  });

  it('should accept a delivered order with a deliveredAt timestamp', () => {
    expect(
      orderListingSchema.safeParse({
        ...VALID_LOCAL_ORDER,
        type: 'Delivery',
        ...DELIVERY_FIELDS,
        deliveredAt: '2026-09-09T15:30:00Z',
      }).success,
    ).toBe(true);
  });

  it('should reject a line with a zero quantity', () => {
    const order = {
      ...VALID_LOCAL_ORDER,
      items: [
        { id: 'line-1', itemId: 'catalog-pizza-1', quantity: 0, status: null },
      ],
    };
    expect(orderListingSchema.safeParse(order).success).toBe(false);
  });
});
