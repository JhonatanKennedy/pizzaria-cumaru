import { z } from 'zod';

export const itemFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  description: z.string().trim().min(1, 'Descrição é obrigatória'),
  price: z.number().positive('Preço deve ser maior que zero'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  requiresPreparation: z.boolean(),
  ingredientIds: z.array(z.string()),
});

export type TItemFormValues = z.infer<typeof itemFormSchema>;

export const priceFormSchema = z.object({
  price: z.number().positive('Preço deve ser maior que zero'),
});

export type TPriceFormValues = z.infer<typeof priceFormSchema>;

export const ingredientNameFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
});

export type TIngredientNameFormValues = z.infer<
  typeof ingredientNameFormSchema
>;
