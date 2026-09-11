import { Item } from './items.js';
import { EItemCategory } from '../enums/item-category.js';

const ITEM_ID = 'item-1';
const PRICE = 45;
const DESCRIPTION =
  'Calabresa sausage, onions and mozzarella over tomato sauce';

function makeItem(ingredientIds: string[] = []): Item {
  return Item.create({
    id: ITEM_ID,
    name: 'Calabresa',
    description: DESCRIPTION,
    price: PRICE,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientIds,
  });
}

describe('Item', () => {
  it('should keep every field given at creation', () => {
    const item = makeItem();

    expect(item.getId()).toBe(ITEM_ID);
    expect(item.getName()).toBe('Calabresa');
    expect(item.getDescription()).toBe(DESCRIPTION);
    expect(item.getPrice()).toBe(PRICE);
    expect(item.getCategory()).toBe(EItemCategory.PIZZA);
    expect(item.getRequiresPreparation()).toBe(true);
  });

  it('should link no ingredients when none are given', () => {
    expect(makeItem().getIngredientIds()).toEqual([]);
  });

  it('should refuse an empty name on creation', () => {
    expect(() =>
      Item.create({
        id: ITEM_ID,
        name: '   ',
        description: DESCRIPTION,
        price: PRICE,
        category: EItemCategory.PIZZA,
        requiresPreparation: true,
      }),
    ).toThrow('Name is required');
  });

  it('should refuse a negative price on creation', () => {
    expect(() =>
      Item.create({
        id: ITEM_ID,
        name: 'Calabresa',
        description: DESCRIPTION,
        price: -1,
        category: EItemCategory.PIZZA,
        requiresPreparation: true,
      }),
    ).toThrow('Price cannot be negative');
  });

  it('should accept an item that costs nothing', () => {
    const item = Item.create({
      id: ITEM_ID,
      name: 'Calabresa',
      description: DESCRIPTION,
      price: 0,
      category: EItemCategory.PIZZA,
      requiresPreparation: true,
    });

    expect(item.getPrice()).toBe(0);
  });

  it('should rename the item', () => {
    const item = makeItem();

    item.rename('Calabresa Especial');

    expect(item.getName()).toBe('Calabresa Especial');
  });

  it('should refuse an empty name on rename', () => {
    const item = makeItem();

    expect(() => item.rename('  ')).toThrow('Name is required');
    expect(item.getName()).toBe('Calabresa');
  });

  it('should change the price and refuse a negative one', () => {
    const item = makeItem();

    item.changePrice(50);
    expect(item.getPrice()).toBe(50);

    expect(() => item.changePrice(-1)).toThrow('Price cannot be negative');
    expect(item.getPrice()).toBe(50);
  });

  it('should replace the ingredient links wholesale, copying the caller array', () => {
    const item = makeItem(['ingredient-1']);
    const replacement = ['ingredient-2', 'ingredient-3'];

    item.replaceIngredients(replacement);
    replacement.push('ingredient-4');

    expect(item.getIngredientIds()).toEqual(['ingredient-2', 'ingredient-3']);
  });
});
