import { z } from 'zod';
import { apiRequest } from './http-client';

export const TABLES_QUERY_KEY = ['tables'] as const;

export const tableListingEntrySchema = z.object({
  id: z.string(),
  number: z.number().int().positive(),
  openOrder: z
    .object({
      orderId: z.string(),
      totalPrice: z.number(),
    })
    .nullable(),
});

export type TTableListingEntry = z.infer<typeof tableListingEntrySchema>;

export const tableListingSchema = z.array(tableListingEntrySchema);

export type TTableListing = z.infer<typeof tableListingSchema>;

export async function listTables(): Promise<TTableListing> {
  const data = await apiRequest('/tables');
  return tableListingSchema.parse(data);
}
