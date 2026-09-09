import {
  ingredientNameFormSchema,
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
