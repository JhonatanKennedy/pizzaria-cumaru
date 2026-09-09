import {
  dailyEarningsReportSchema,
  getDailyEarningsReport,
} from './reports.api';

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock('@api/http-client', () => ({ apiRequest: apiRequestMock }));

const REPORT = { grandTotal: 690, localTotal: 480, deliveryTotal: 210 };

describe('dailyEarningsReportSchema', () => {
  it('should accept a full report payload', () => {
    expect(dailyEarningsReportSchema.safeParse(REPORT).success).toBe(true);
  });

  it('should reject a payload missing a subtotal field', () => {
    expect(
      dailyEarningsReportSchema.safeParse({ grandTotal: 690, localTotal: 480 })
        .success,
    ).toBe(false);
  });

  it('should reject a payload with a non-numeric total', () => {
    expect(
      dailyEarningsReportSchema.safeParse({
        ...REPORT,
        grandTotal: '690',
      }).success,
    ).toBe(false);
  });
});

describe('getDailyEarningsReport', () => {
  it('should fetch the totals without a type filter by default', async () => {
    apiRequestMock.mockResolvedValue(REPORT);

    await expect(getDailyEarningsReport()).resolves.toEqual(REPORT);
    expect(apiRequestMock).toHaveBeenCalledWith('/reports/daily-earnings');
  });

  it('should pass a Local type filter in the query string', async () => {
    apiRequestMock.mockResolvedValue(REPORT);

    await getDailyEarningsReport('Local');

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/reports/daily-earnings?type=Local',
    );
  });

  it('should pass a Delivery type filter in the query string', async () => {
    apiRequestMock.mockResolvedValue(REPORT);

    await getDailyEarningsReport('Delivery');

    expect(apiRequestMock).toHaveBeenCalledWith(
      '/reports/daily-earnings?type=Delivery',
    );
  });
});
