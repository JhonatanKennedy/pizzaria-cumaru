import { daySalesListingSchema, getDaySales } from './daily-sales.api';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@api/http-client', () => ({ apiRequest: apiRequestMock }));

const LOCAL_SALE = {
  id: 'sale-local',
  waiterName: 'João Garçom',
  type: 'Local',
  status: 'Closed',
  paymentType: 'Pix',
  tableId: '5',
  createdAt: '2026-09-07T14:30:00.000Z',
  closedAt: '2026-09-07T14:30:00.000Z',
  deliveredAt: null,
  totalPrice: 120,
  items: [
    { id: 'line-1', itemId: 'catalog-1', quantity: 2, status: 'Pending' },
  ],
};

const DELIVERY_SALE = {
  id: 'sale-delivery',
  waiterName: 'João Garçom',
  type: 'Delivery',
  status: 'Delivered',
  paymentType: null,
  createdAt: '2026-09-07T19:00:00.000Z',
  closedAt: null,
  deliveredAt: '2026-09-07T19:00:00.000Z',
  totalPrice: 60,
  items: [{ id: 'line-2', itemId: 'catalog-2', quantity: 1, status: 'Ready' }],
};

describe('daySalesListingSchema', () => {
  it('should accept a listing with a closed local and a delivered delivery sale', () => {
    const parsed = daySalesListingSchema.safeParse([LOCAL_SALE, DELIVERY_SALE]);

    expect(parsed.success).toBe(true);
  });

  it('should reject a sale whose payment method is not a string or null', () => {
    const malformed = {
      ...LOCAL_SALE,
      paymentType: 42,
    };

    expect(daySalesListingSchema.safeParse([malformed]).success).toBe(false);
  });

  it('should reject a sale missing its items', () => {
    expect(
      daySalesListingSchema.safeParse([{ ...LOCAL_SALE, items: undefined }])
        .success,
    ).toBe(false);
  });
});

describe('getDaySales', () => {
  it('should fetch and parse the day sales listing', async () => {
    apiRequestMock.mockResolvedValue([LOCAL_SALE, DELIVERY_SALE]);

    await expect(getDaySales()).resolves.toEqual([LOCAL_SALE, DELIVERY_SALE]);
    expect(apiRequestMock).toHaveBeenCalledWith('/reports/daily-sales');
  });
});
