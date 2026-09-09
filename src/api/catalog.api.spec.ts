import { ingredientListingSchema, menuListingSchema } from './catalog.api';

const VALID_MENU_ITEM = {
  id: 'catalog-pizza-1',
  name: 'Calabresa',
  description: 'Mussarela e calabresa',
  price: 45,
  category: 'PIZZA',
  requiresPreparation: true,
  available: true,
  ingredientIds: ['ingredient-1'],
};

const VALID_INGREDIENT = {
  id: 'ingredient-1',
  name: 'Mussarela',
  available: true,
};

describe('menuListingSchema', () => {
  it('should accept the backend menu listing', () => {
    expect(menuListingSchema.safeParse([VALID_MENU_ITEM]).success).toBe(true);
  });

  it('should reject an item without the availability flag', () => {
    const { available: _available, ...withoutAvailability } = VALID_MENU_ITEM;
    expect(menuListingSchema.safeParse([withoutAvailability]).success).toBe(
      false,
    );
  });

  it('should reject an item without the ingredient links', () => {
    const { ingredientIds: _ingredientIds, ...withoutIngredientIds } =
      VALID_MENU_ITEM;
    expect(menuListingSchema.safeParse([withoutIngredientIds]).success).toBe(
      false,
    );
  });
});

describe('ingredientListingSchema', () => {
  it('should accept the backend ingredient listing', () => {
    expect(ingredientListingSchema.safeParse([VALID_INGREDIENT]).success).toBe(
      true,
    );
  });

  it('should reject an ingredient without the stock flag', () => {
    const { available: _available, ...withoutAvailability } = VALID_INGREDIENT;
    expect(
      ingredientListingSchema.safeParse([withoutAvailability]).success,
    ).toBe(false);
  });
});
