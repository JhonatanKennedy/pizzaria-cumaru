import { kitchenQueueSchema } from './kitchen.api';

const QUEUE_ITEM_WITH_NOTES = {
  orderItemId: 'order-item-1',
  itemId: 'catalog-pizza-1',
  name: 'Calabresa',
  quantity: 2,
  status: 'Pending',
  createdAt: '2026-09-09T12:00:00Z',
  notes: 'sem cebola',
};

const QUEUE_ITEM_WITHOUT_NOTES = {
  orderItemId: 'order-item-2',
  itemId: 'catalog-pizza-2',
  name: 'Portuguesa',
  quantity: 1,
  status: 'Preparing',
  createdAt: '2026-09-09T12:01:00Z',
};

const QUEUE_ORDER = {
  orderId: 'order-1',
  type: 'Local',
  createdAt: '2026-09-09T12:00:00Z',
  items: [QUEUE_ITEM_WITH_NOTES, QUEUE_ITEM_WITHOUT_NOTES],
};

describe('kitchenQueueSchema', () => {
  it('should accept delivery and local queues with and without notes', () => {
    const queue = {
      delivery: [
        {
          orderId: 'order-2',
          type: 'Delivery',
          createdAt: '2026-09-09T12:02:00Z',
          items: [QUEUE_ITEM_WITH_NOTES],
        },
      ],
      local: [QUEUE_ORDER],
    };
    expect(kitchenQueueSchema.safeParse(queue).success).toBe(true);
  });

  it('should default parts to [] and carry a composition through the parse', () => {
    const queue = {
      delivery: [],
      local: [
        {
          ...QUEUE_ORDER,
          items: [
            { ...QUEUE_ITEM_WITHOUT_NOTES },
            {
              ...QUEUE_ITEM_WITH_NOTES,
              name: 'Mussarela G',
              parts: [
                { name: 'Mussarela G', pieces: 6 },
                { name: 'Chocolate G', pieces: 2 },
              ],
            },
          ],
        },
      ],
    };
    const parsed = kitchenQueueSchema.parse(queue);

    expect(parsed.local[0].items[0].parts).toEqual([]);
    expect(parsed.local[0].items[1].parts).toEqual([
      { name: 'Mussarela G', pieces: 6 },
      { name: 'Chocolate G', pieces: 2 },
    ]);
  });

  it('should reject an item with a status outside the queue states', () => {
    const queue = {
      delivery: [],
      local: [
        {
          ...QUEUE_ORDER,
          items: [{ ...QUEUE_ITEM_WITHOUT_NOTES, status: 'Ready' }],
        },
      ],
    };
    expect(kitchenQueueSchema.safeParse(queue).success).toBe(false);
  });

  it('should reject an order type outside the Local/Delivery union', () => {
    const queue = {
      delivery: [],
      local: [{ ...QUEUE_ORDER, type: 'Takeout' }],
    };
    expect(kitchenQueueSchema.safeParse(queue).success).toBe(false);
  });
});
