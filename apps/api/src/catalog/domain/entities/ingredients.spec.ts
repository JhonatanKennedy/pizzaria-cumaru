import { Ingredient } from './ingredients.js';

const INGREDIENT_ID = 'ingredient-1';

describe('Ingredient', () => {
  it('should start with the stock state given at creation', () => {
    const ingredient = Ingredient.create({
      id: INGREDIENT_ID,
      name: 'Mussarela',
      inStock: true,
    });

    expect(ingredient.isAvailable()).toBe(true);
    expect(ingredient.getName()).toBe('Mussarela');
  });

  it('should refuse an empty name on creation', () => {
    expect(() =>
      Ingredient.create({ id: INGREDIENT_ID, name: '   ', inStock: true }),
    ).toThrow('Name is required');
  });

  it('should rename the ingredient', () => {
    const ingredient = Ingredient.create({
      id: INGREDIENT_ID,
      name: 'Mussarela',
      inStock: true,
    });

    ingredient.rename('Muçarela');

    expect(ingredient.getName()).toBe('Muçarela');
    expect(ingredient.getId()).toBe(INGREDIENT_ID);
  });

  it('should refuse renaming with a blank name', () => {
    const ingredient = Ingredient.create({
      id: INGREDIENT_ID,
      name: 'Mussarela',
      inStock: true,
    });

    expect(() => ingredient.rename('  ')).toThrow('Name is required');
    expect(ingredient.getName()).toBe('Mussarela');
  });
});
