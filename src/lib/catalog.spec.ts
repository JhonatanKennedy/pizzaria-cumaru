import type { TMenuListing } from '@api/catalog.api';
import { categoryLabel, catalogById, REMOVED_ITEM_LABEL } from './catalog';

const MENU: TMenuListing = [
  {
    id: 'catalog-pizza-1',
    name: 'Calabresa',
    description: 'Mussarela e calabresa',
    price: 45,
    category: 'PIZZA',
    requiresPreparation: true,
    available: true,
    ingredientIds: [],
  },
];

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

describe('catalogById', () => {
  it('should index the menu by item id', () => {
    const byId = catalogById(MENU);

    expect(byId.get('catalog-pizza-1')?.name).toBe('Calabresa');
    expect(byId.get('catalog-pizza-1')?.category).toBe('PIZZA');
    expect(byId.has('unknown-item')).toBe(false);
  });

  it('should expose the label used when an item left the menu', () => {
    expect(REMOVED_ITEM_LABEL).toBe('Item removido do cardápio');
  });
});
