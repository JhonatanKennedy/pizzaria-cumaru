import { z } from 'zod';

// No local required rules on name/address: the Gherkin asserts the backend's
// own rejections verbatim ("Delivery address is required for delivery"), so
// an empty form surfaces the backend message instead of a local one.
export const createDeliveryOrderFormSchema = z.object({
  customerName: z.string(),
  phone: z.string(),
  address: z.string(),
});

export type TCreateDeliveryOrderFormValues = z.infer<
  typeof createDeliveryOrderFormSchema
>;

export const addItemFormSchema = z.object({
  quantity: z.number().min(1, 'Quantidade mínima é 1'),
  flavors: z.string(),
  notes: z.string(),
});

export type TAddItemFormValues = z.infer<typeof addItemFormSchema>;
