import { categoryLabel } from './catalog';

describe('categoryLabel', () => {
  it('should map every known category to its Portuguese label', () => {
    expect(categoryLabel('PIZZA')).toBe('Pizzas');
    expect(categoryLabel('DISH')).toBe('Pratos');
    expect(categoryLabel('DRINK')).toBe('Bebidas');
    expect(categoryLabel('DESSERT')).toBe('Sobremesas');
    expect(categoryLabel('SIDE')).toBe('Acompanhamentos');
  });

  it('should fall back to the raw value for unknown categories', () => {
    expect(categoryLabel('NOVELTY')).toBe('NOVELTY');
  });
});
