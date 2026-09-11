import {
  NO_SIZE,
  ingredientNameFormSchema,
  isKitchenCategory,
  isPizzaCategory,
  itemFormSchema,
  priceFormSchema,
  selectedPizzaSize,
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

describe('the item form size', () => {
  // The seed keeps token-less pizzas so past orders keep resolving their
  // catalog item, and editing one runs this same schema — so "no size" must
  // never be a validation failure.
  it('should default to no size', () => {
    const result = itemFormSchema.safeParse(VALID_ITEM_FORM);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.size).toBe(NO_SIZE);
    }
  });

  it('should keep a chosen size', () => {
    const result = itemFormSchema.safeParse({
      ...VALID_ITEM_FORM,
      size: 'G',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.size).toBe('G');
    }
  });

  it('should reject a size outside the registry', () => {
    expect(
      itemFormSchema.safeParse({ ...VALID_ITEM_FORM, size: 'GG' }).success,
    ).toBe(false);
  });
});

describe('selectedPizzaSize', () => {
  it('should read the size of a pizza', () => {
    expect(selectedPizzaSize('PIZZA', 'G')).toBe('G');
    expect(selectedPizzaSize('PIZZA', 'M')).toBe('M');
  });

  it('should read no size when the pizza was left unsized', () => {
    expect(selectedPizzaSize('PIZZA', NO_SIZE)).toBeNull();
  });

  it('should read no size before the field has a value', () => {
    expect(selectedPizzaSize('PIZZA', undefined)).toBeNull();
  });

  it('should read no size for a category that has none', () => {
    expect(selectedPizzaSize('DRINK', 'G')).toBeNull();
    expect(selectedPizzaSize('DISH', 'M')).toBeNull();
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

describe('isPizzaCategory', () => {
  it('should answer for the one category that carries a size', () => {
    expect(isPizzaCategory('PIZZA')).toBe(true);
    expect(isPizzaCategory('DISH')).toBe(false);
    expect(isPizzaCategory('DRINK')).toBe(false);
    expect(isPizzaCategory('DESSERT')).toBe(false);
    expect(isPizzaCategory('SIDE')).toBe(false);
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
