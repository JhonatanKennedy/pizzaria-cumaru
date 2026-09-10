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
    {
      id: 'line-1',
      itemId: 'catalog-pizza-1',
      quantity: 2,
      status: 'Pending',
      unitPrice: 45,
    },
    {
      id: 'line-2',
      itemId: 'catalog-drink-1',
      quantity: 1,
      status: null,
      unitPrice: 8,
    },
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
        {
          id: 'line-1',
          itemId: 'catalog-pizza-1',
          quantity: 0,
          status: null,
          unitPrice: 45,
        },
      ],
    };
    expect(orderListingSchema.safeParse(order).success).toBe(false);
  });

  it('should default the parts of an item without a recorded composition', () => {
    const order = orderListingSchema.parse(VALID_LOCAL_ORDER);

    expect(order.items[0].parts).toEqual([]);
  });

  it('should carry the parts and unit price of a composed item', () => {
    const order = orderListingSchema.parse({
      ...VALID_LOCAL_ORDER,
      items: [
        {
          ...VALID_LOCAL_ORDER.items[0],
          unitPrice: 52,
          parts: [
            { name: 'Calabresa G', pieces: 6 },
            { name: 'Chocolate G', pieces: 2 },
          ],
        },
      ],
    });

    expect(order.items[0].unitPrice).toBe(52);
    expect(order.items[0].parts).toEqual([
      { name: 'Calabresa G', pieces: 6 },
      { name: 'Chocolate G', pieces: 2 },
    ]);
  });

  it('should reject a part without pieces', () => {
    const order = {
      ...VALID_LOCAL_ORDER,
      items: [
        {
          ...VALID_LOCAL_ORDER.items[0],
          unitPrice: 45,
          parts: [{ name: 'Chocolate G' }],
        },
      ],
    };
    expect(orderListingSchema.safeParse(order).success).toBe(false);
  });
});
