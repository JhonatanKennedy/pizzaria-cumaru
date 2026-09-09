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
