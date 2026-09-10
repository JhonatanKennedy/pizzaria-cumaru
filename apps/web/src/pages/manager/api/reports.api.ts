import { z } from 'zod';
import { apiRequest } from '@api/http-client';

export const REPORT_TYPES = ['Local', 'Delivery'] as const;
export type TReportType = (typeof REPORT_TYPES)[number];

// Mirrors GET /reports/daily-earnings (backend GetDailyEarningsReportUseCase):
// the day's totals in reais, with the optional type filter zeroing the other
// subtotal and narrowing grandTotal.
export const dailyEarningsReportSchema = z.object({
  grandTotal: z.number(),
  localTotal: z.number(),
  deliveryTotal: z.number(),
});

export type TDailyEarningsReport = z.infer<typeof dailyEarningsReportSchema>;

export function dailyEarningsQueryKey(
  type?: TReportType,
): readonly ['reports', 'daily-earnings', TReportType | undefined] {
  return ['reports', 'daily-earnings', type];
}

export async function getDailyEarningsReport(
  type?: TReportType,
): Promise<TDailyEarningsReport> {
  const query = type ? `?type=${type}` : '';
  const data = await apiRequest(`/reports/daily-earnings${query}`);
  return dailyEarningsReportSchema.parse(data);
}
