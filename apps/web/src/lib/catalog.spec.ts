import type { TMenuListing } from '@api/catalog.api';
import {
  categoryLabel,
  catalogById,
  filterCatalogItems,
  REMOVED_ITEM_LABEL,
} from './catalog';

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

const FULL_MENU: TMenuListing = [
  ...MENU,
  {
    id: 'catalog-pizza-2',
    name: 'Açaí',
    description: 'Açaí com granola',
    price: 22,
    category: 'DESSERT',
    requiresPreparation: false,
    available: true,
    ingredientIds: [],
  },
  {
    id: 'catalog-pizza-3',
    name: 'Suco Natural',
    description: 'Laranja',
    price: 8,
    category: 'DRINK',
    requiresPreparation: false,
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

describe('filterCatalogItems', () => {
  it('should keep the whole catalog with no filter at all', () => {
    const visible = filterCatalogItems(FULL_MENU, {
      category: null,
      query: '',
    });

    expect(visible).toHaveLength(FULL_MENU.length);
  });

  it('should keep only the picked category', () => {
    const visible = filterCatalogItems(FULL_MENU, {
      category: 'DRINK',
      query: '',
    });

    expect(visible.map((item) => item.name)).toEqual(['Suco Natural']);
  });

  it('should narrow within the picked category', () => {
    const visible = filterCatalogItems(FULL_MENU, {
      category: 'DESSERT',
      query: 'acai',
    });

    expect(visible.map((item) => item.name)).toEqual(['Açaí']);
  });

  // The waiter types a name, not "name within a category" — so a query has to
  // be able to come back empty on the category the panel happens to be on.
  it('should find nothing when the query is outside the picked category', () => {
    const visible = filterCatalogItems(FULL_MENU, {
      category: 'DRINK',
      query: 'calabresa',
    });

    expect(visible).toEqual([]);
  });

  it('should search the whole catalog when no category is picked', () => {
    const visible = filterCatalogItems(FULL_MENU, {
      category: null,
      query: 'calabresa',
    });

    expect(visible.map((item) => item.name)).toEqual(['Calabresa']);
  });
});
