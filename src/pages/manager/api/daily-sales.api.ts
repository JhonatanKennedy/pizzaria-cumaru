import { z } from 'zod';
import { apiRequest } from '@api/http-client';
import { REPORT_TYPES } from './reports.api';

// Mirrors GET /reports/daily-sales (backend ListDaySalesUseCase): the day's
// completed sales — closed local orders and delivered delivery orders — with
// the payment method and sale time only where the flow sets them (delivery
// sales carry neither paymentType nor closedAt).
export const daySaleItemSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  quantity: z.number(),
  status: z.string().nullable(),
});

export type TDaySaleItem = z.infer<typeof daySaleItemSchema>;

export const daySaleSchema = z.object({
  id: z.string(),
  waiterName: z.string().nullable(),
  type: z.enum(REPORT_TYPES),
  status: z.string(),
  paymentType: z.string().nullable(),
  tableId: z.string().optional(),
  createdAt: z.string(),
  closedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  totalPrice: z.number(),
  items: z.array(daySaleItemSchema),
});

export type TDaySale = z.infer<typeof daySaleSchema>;

export const daySalesListingSchema = z.array(daySaleSchema);

export const DAY_SALES_QUERY_KEY = ['reports', 'daily-sales'] as const;

export async function getDaySales(): Promise<TDaySale[]> {
  const data = await apiRequest('/reports/daily-sales');
  return daySalesListingSchema.parse(data);
}
