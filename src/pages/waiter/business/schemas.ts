import { z } from 'zod';

export const menuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  category: z.string(),
  requiresPreparation: z.boolean(),
  available: z.boolean(),
});

export type TMenuItem = z.infer<typeof menuItemSchema>;

export const menuListingSchema = z.array(menuItemSchema);

export type TMenuListing = z.infer<typeof menuListingSchema>;

export const orderItemListingSchema = z.object({
  id: z.string(),
  itemId: z.string(),
  quantity: z.number().int().positive(),
  status: z.string().nullable(),
});

export const orderListingSchema = z.object({
  id: z.string(),
  waiterName: z.string().nullable(),
  type: z.string(),
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

export const cancelItemFormSchema = z.object({
  reason: z.string().trim().min(1, 'Motivo é obrigatório'),
});

export type TCancelItemFormValues = z.infer<typeof cancelItemFormSchema>;
