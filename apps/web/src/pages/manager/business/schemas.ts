import { z } from 'zod';

// Kitchen-made categories: their items must carry the preparation flag or
// they would never reach the kitchen queue. The rule refuses the form with
// an exact message (asserted by the feature specs) instead of locking the
// checkbox, so unchecking surfaces the explanation.
export function isKitchenCategory(category: string): boolean {
  return category === 'PIZZA' || category === 'DISH';
}

export const itemFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    description: z.string().trim().min(1, 'Descrição é obrigatória'),
    price: z.number().positive('Preço deve ser maior que zero'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    requiresPreparation: z.boolean(),
    ingredientIds: z.array(z.string()),
  })
  .superRefine((values, ctx) => {
    if (!values.requiresPreparation && isKitchenCategory(values.category)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['requiresPreparation'],
        message: 'Pizzas e pratos exigem "Exige preparo"',
      });
    }
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
