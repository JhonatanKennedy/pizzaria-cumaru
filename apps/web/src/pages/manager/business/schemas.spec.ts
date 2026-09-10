import {
  ingredientNameFormSchema,
  isKitchenCategory,
  itemFormSchema,
  priceFormSchema,
} from './schemas';

const VALID_ITEM_FORM = {
  name: 'Calabresa Especial',
  description: 'Mussarela e calabresa',
  price: 55,
  category: 'PIZZA',
  requiresPreparation: true,
  ingredientIds: [],
};

describe('itemFormSchema', () => {
  it('should accept a full item payload', () => {
    expect(itemFormSchema.safeParse(VALID_ITEM_FORM).success).toBe(true);
  });

  it('should reject a blank name', () => {
    expect(
      itemFormSchema.safeParse({ ...VALID_ITEM_FORM, name: ' ' }).success,
    ).toBe(false);
  });

  it('should reject a non-positive price', () => {
    expect(
      itemFormSchema.safeParse({ ...VALID_ITEM_FORM, price: 0 }).success,
    ).toBe(false);
  });

  it('should reject an absent ingredient list', () => {
    const { ingredientIds: _ingredientIds, ...withoutIngredientIds } =
      VALID_ITEM_FORM;
    expect(itemFormSchema.safeParse(withoutIngredientIds).success).toBe(false);
  });

  it('should keep the selected ingredient ids', () => {
    const result = itemFormSchema.safeParse({
      ...VALID_ITEM_FORM,
      ingredientIds: ['ingredient-1', 'ingredient-2'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ingredientIds).toEqual([
        'ingredient-1',
        'ingredient-2',
      ]);
    }
  });

  it('should reject a non-array ingredient list', () => {
    expect(
      itemFormSchema.safeParse({
        ...VALID_ITEM_FORM,
        ingredientIds: 'ingredient-1',
      }).success,
    ).toBe(false);
  });

  it('should accept a dish with the preparation flag checked', () => {
    expect(
      itemFormSchema.safeParse({
        ...VALID_ITEM_FORM,
        category: 'DISH',
      }).success,
    ).toBe(true);
  });

  it('should accept a drink without the preparation flag', () => {
    expect(
      itemFormSchema.safeParse({
        ...VALID_ITEM_FORM,
        category: 'DRINK',
        requiresPreparation: false,
      }).success,
    ).toBe(true);
  });

  it('should accept a dessert without the preparation flag', () => {
    expect(
      itemFormSchema.safeParse({
        ...VALID_ITEM_FORM,
        category: 'DESSERT',
        requiresPreparation: false,
      }).success,
    ).toBe(true);
  });

  it('should refuse a pizza without the preparation flag', () => {
    const result = itemFormSchema.safeParse({
      ...VALID_ITEM_FORM,
      category: 'PIZZA',
      requiresPreparation: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) =>
            issue.path[0] === 'requiresPreparation' &&
            issue.message === 'Pizzas e pratos exigem "Exige preparo"',
        ),
      ).toBe(true);
    }
  });

  it('should refuse a dish without the preparation flag', () => {
    const result = itemFormSchema.safeParse({
      ...VALID_ITEM_FORM,
      category: 'DISH',
      requiresPreparation: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some(
          (issue) => issue.message === 'Pizzas e pratos exigem "Exige preparo"',
        ),
      ).toBe(true);
    }
  });
});

describe('isKitchenCategory', () => {
  it('should tell kitchen-made categories from the rest', () => {
    expect(isKitchenCategory('PIZZA')).toBe(true);
    expect(isKitchenCategory('DISH')).toBe(true);
    expect(isKitchenCategory('DRINK')).toBe(false);
    expect(isKitchenCategory('DESSERT')).toBe(false);
    expect(isKitchenCategory('SIDE')).toBe(false);
  });
});

describe('priceFormSchema', () => {
  it('should accept a positive price', () => {
    expect(priceFormSchema.safeParse({ price: 45 }).success).toBe(true);
  });

  it('should reject a non-positive price', () => {
    expect(priceFormSchema.safeParse({ price: 0 }).success).toBe(false);
  });
});

describe('ingredientNameFormSchema', () => {
  it('should accept a name', () => {
    expect(
      ingredientNameFormSchema.safeParse({ name: 'Catupiry' }).success,
    ).toBe(true);
  });

  it('should reject a blank name', () => {
    expect(ingredientNameFormSchema.safeParse({ name: ' ' }).success).toBe(
      false,
    );
  });
});
