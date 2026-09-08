import {
  addItemFormSchema,
  cancelItemFormSchema,
  menuListingSchema,
  orderListingSchema,
  tableOrderFormSchema,
} from './schemas';

const VALID_MENU_ITEM = {
  id: 'catalog-pizza-1',
  name: 'Calabresa',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
};

const VALID_ORDER = {
  id: 'order-1',
  waiterName: 'joao.garcom',
  type: 'LOCAL',
  status: 'Open',
  tableId: '5',
  createdAt: '2026-09-08T12:00:00Z',
  totalPrice: 90,
  items: [
    { id: 'line-1', itemId: 'catalog-pizza-1', quantity: 2, status: 'Pending' },
    { id: 'line-2', itemId: 'catalog-drink-1', quantity: 1, status: null },
  ],
};

describe('menuListingSchema', () => {
  it('should accept the backend menu listing', () => {
    expect(menuListingSchema.safeParse([VALID_MENU_ITEM]).success).toBe(true);
  });

  it('should reject an item without the availability flag', () => {
    const { available: _available, ...withoutAvailability } = VALID_MENU_ITEM;
    expect(menuListingSchema.safeParse([withoutAvailability]).success).toBe(
      false,
    );
  });
});

describe('orderListingSchema', () => {
  it('should accept the backend order listing', () => {
    expect(orderListingSchema.safeParse(VALID_ORDER).success).toBe(true);
  });

  it('should reject a line with a zero quantity', () => {
    const order = {
      ...VALID_ORDER,
      items: [
        { id: 'line-1', itemId: 'catalog-pizza-1', quantity: 0, status: null },
      ],
    };
    expect(orderListingSchema.safeParse(order).success).toBe(false);
  });
});

describe('tableOrderFormSchema', () => {
  it('should accept a table number', () => {
    expect(tableOrderFormSchema.safeParse({ tableId: '5' }).success).toBe(true);
  });

  it('should reject a blank table number', () => {
    expect(tableOrderFormSchema.safeParse({ tableId: '   ' }).success).toBe(
      false,
    );
  });
});

describe('addItemFormSchema', () => {
  it('should accept quantity, flavors and notes', () => {
    const result = addItemFormSchema.safeParse({
      quantity: 2,
      flavors: 'Calabresa, Portuguesa',
      notes: 'sem cebola',
    });
    expect(result.success).toBe(true);
  });

  it('should reject a quantity below one', () => {
    expect(
      addItemFormSchema.safeParse({ quantity: 0, flavors: '', notes: '' })
        .success,
    ).toBe(false);
  });
});

describe('cancelItemFormSchema', () => {
  it('should accept a reason', () => {
    expect(
      cancelItemFormSchema.safeParse({ reason: 'Cliente desistiu' }).success,
    ).toBe(true);
  });

  it('should reject a blank reason', () => {
    expect(cancelItemFormSchema.safeParse({ reason: ' ' }).success).toBe(false);
  });
});
