import { z } from 'zod';
import { PAYMENT_TYPES } from '@lib/payment-labels';

// Mirrors the backend's CloseOrderUseCase result — the close verb is
// manager-only and local orders only.
export const closedOrderSchema = z.object({
  id: z.string(),
  status: z.string(),
  paymentType: z.enum(PAYMENT_TYPES),
  total: z.number(),
  parts: z.array(z.number()).optional(),
});

export type TClosedOrder = z.infer<typeof closedOrderSchema>;

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
