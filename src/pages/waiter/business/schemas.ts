import { z } from 'zod';

// Mirrors the backend's EOrderType (orders/domain/enums/order-type.ts) —
// sent as-is in create payloads and asserted in the Gherkin specs.
export const ORDER_TYPES = ['Local', 'Delivery'] as const;
export type TOrderType = (typeof ORDER_TYPES)[number];

export const orderItemListingSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  quantity: z.number().int().positive(),
  status: z.string().nullable(),
});

export const orderListingSchema = z.object({
  id: z.string(),
  waiterName: z.string().nullable(),
  type: z.enum(ORDER_TYPES),
  status: z.string(),
  tableId: z.string().optional(),
  createdAt: z.string(),
  totalPrice: z.number(),
  items: z.array(orderItemListingSchema),
});

export type TOrderListing = z.infer<typeof orderListingSchema>;

export const orderListingArraySchema = z.array(orderListingSchema);

export const createdOrderSchema = z.object({
  id: z.string(),
});

export type TCreatedOrder = z.infer<typeof createdOrderSchema>;

export const tableOrderFormSchema = z.object({
  tableId: z.string().trim().min(1, 'Número da mesa é obrigatório'),
});

export type TTableOrderFormValues = z.infer<typeof tableOrderFormSchema>;

export const addItemFormSchema = z.object({
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  flavors: z.string(),
  notes: z.string(),
});

export type TAddItemFormValues = z.infer<typeof addItemFormSchema>;

export const cancellationReasonFormSchema = z.object({
  reason: z.string().trim().min(1, 'Motivo é obrigatório'),
});

export type TCancellationReasonFormValues = z.infer<
  typeof cancellationReasonFormSchema
>;
