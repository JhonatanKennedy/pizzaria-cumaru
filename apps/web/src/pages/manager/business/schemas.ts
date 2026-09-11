import { z } from 'zod';
import { PIZZA_SIZES, type TPizzaSize } from '@lib/flavor-composition';

// Kitchen-made categories: their items must carry the preparation flag or
// they would never reach the kitchen queue. The rule refuses the form with
// an exact message (asserted by the feature specs) instead of locking the
// checkbox, so unchecking surfaces the explanation.
export function isKitchenCategory(category: string): boolean {
  return category === 'PIZZA' || category === 'DISH';
}

// The catalog spells an unsized pizza by the absence of a token, which a
// select cannot render — so the form carries an explicit value for it and
// only the payload builder turns it back into a bare name.
export const NO_SIZE = 'NONE' as const;

export const ITEM_SIZE_VALUES = [...PIZZA_SIZES, NO_SIZE] as const;

export type TItemSizeValue = (typeof ITEM_SIZE_VALUES)[number];

// The one category that carries a size. Spelled once because the form shows
// the selector on it and the payload builder drops the size off it — two
// readings of the same rule that must not drift.
export function isPizzaCategory(category: string): boolean {
  return category === 'PIZZA';
}

export const itemFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Nome é obrigatório'),
    description: z.string().trim().min(1, 'Descrição é obrigatória'),
    price: z.number().positive('Preço deve ser maior que zero'),
    category: z.string().min(1, 'Categoria é obrigatória'),
    requiresPreparation: z.boolean(),
    ingredientIds: z.array(z.string()),
    size: z.enum(ITEM_SIZE_VALUES).default(NO_SIZE),
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

// `size` carries a default, so the schema's input and output differ and the
// form has to name both: it starts from the input, and the resolver hands the
// output back with the size filled in.
export type TItemFormInput = z.input<typeof itemFormSchema>;

export type TItemFormValues = z.output<typeof itemFormSchema>;

// Only a pizza carries a size, and "sem tamanho" is not one. The category
// guard earns its place: switching a create away from Pizzas unmounts the
// select without clearing the value it held, so the form cannot trust the
// selection alone. `undefined` is the field before anything filled it.
export function selectedPizzaSize(
  category: string,
  size: TItemSizeValue | undefined,
): TPizzaSize | null {
  if (!isPizzaCategory(category) || size === undefined || size === NO_SIZE) {
    return null;
  }
  return size;
}

export const priceFormSchema = z.object({
  price: z.number().positive('Preço deve ser maior que zero'),
});

export const ingredientNameFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
});

export type TIngredientNameFormValues = z.infer<
  typeof ingredientNameFormSchema
>;
