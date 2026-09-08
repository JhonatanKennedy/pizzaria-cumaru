import { MarkIngredientOutOfStockUseCase } from './mark-ingredient-out-of-stock.js';
import { MarkIngredientInStockUseCase } from './mark-ingredient-in-stock.js';
import { UpdateItemPriceUseCase } from './update-item-price.js';
import { ListItemsUseCase } from './list-items.js';
import { ListIngredientsUseCase } from './list-ingredients.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';
import { Item } from '../../domain/entities/items.js';
import { Ingredient } from '../../domain/entities/ingredients.js';
import { EItemCategory } from '../../domain/enums/item-category.js';

const INGREDIENT_ID = 'ingredient-1';
const ITEM_ID = 'item-1';

function makeIngredient(inStock: boolean): Ingredient {
  return Ingredient.create({ id: INGREDIENT_ID, name: 'Mussarela', inStock });
}

function makePizza(ingredientIds: string[] = [INGREDIENT_ID]): Item {
  return Item.create({
    id: ITEM_ID,
    name: 'Calabresa',
    description: 'Pizza de calabresa',
    price: 45,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredientIds,
  });
}

function makeRepository(
  ingredients: Ingredient[],
  items: Item[],
  findIngredient: Ingredient | null = null,
  findItem: Item | null = null,
) {
  return {
    findAllItems: vi.fn(async () => items),
    findAllIngredients: vi.fn(async () => ingredients),
    findItemById: vi.fn(async () => findItem),
    findItemByName: vi.fn(async () => null),
    findIngredientById: vi.fn(async () => findIngredient),
    saveItem: vi.fn(async () => undefined),
    saveIngredient: vi.fn(async () => undefined),
  } as unknown as ICatalogRepository;
}

describe('MarkIngredientOutOfStockUseCase', () => {
  it('should mark the ingredient unavailable and persist it', async () => {
    const ingredient = makeIngredient(true);
    const repository = makeRepository([], [], ingredient);
    const useCase = new MarkIngredientOutOfStockUseCase(repository);

    await useCase.execute(INGREDIENT_ID);

    expect(ingredient.isAvailable()).toBe(false);
    expect(repository.saveIngredient).toHaveBeenCalledWith(ingredient);
  });

  it('should refuse an unknown ingredient', async () => {
    const repository = makeRepository([], [], null);
    const useCase = new MarkIngredientOutOfStockUseCase(repository);

    await expect(useCase.execute('unknown')).rejects.toThrow(
      'Ingredient not found',
    );
    expect(repository.saveIngredient).not.toHaveBeenCalled();
  });
});

describe('MarkIngredientInStockUseCase', () => {
  it('should restore the ingredient and persist it', async () => {
    const ingredient = makeIngredient(false);
    const repository = makeRepository([], [], ingredient);
    const useCase = new MarkIngredientInStockUseCase(repository);

    await useCase.execute(INGREDIENT_ID);

    expect(ingredient.isAvailable()).toBe(true);
    expect(repository.saveIngredient).toHaveBeenCalledWith(ingredient);
  });
});

describe('UpdateItemPriceUseCase', () => {
  it('should update the price and persist the item', async () => {
    const item = makePizza();
    const repository = makeRepository([], [], null, item);
    const useCase = new UpdateItemPriceUseCase(repository);

    await useCase.execute({ itemId: ITEM_ID, price: 48 });

    expect(item.getPrice()).toBe(48);
    expect(repository.saveItem).toHaveBeenCalledWith(item);
  });

  it('should refuse a negative price with the domain message', async () => {
    const repository = makeRepository([], [], null, makePizza());
    const useCase = new UpdateItemPriceUseCase(repository);

    await expect(
      useCase.execute({ itemId: ITEM_ID, price: -5 }),
    ).rejects.toThrow('Price cannot be negative');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });

  it('should refuse an unknown item', async () => {
    const repository = makeRepository([], [], null, null);
    const useCase = new UpdateItemPriceUseCase(repository);

    await expect(
      useCase.execute({ itemId: 'unknown', price: 48 }),
    ).rejects.toThrow('Item not found');
  });
});

describe('ListItemsUseCase', () => {
  it('should flag items as available only when every ingredient is in stock', async () => {
    const item = makePizza();
    const availableIngredient = makeIngredient(true);
    const repository = makeRepository([availableIngredient], [item]);
    const useCase = new ListItemsUseCase(repository);

    const listing = await useCase.execute();

    expect(listing).toEqual([
      {
        id: ITEM_ID,
        name: 'Calabresa',
        description: 'Pizza de calabresa',
        price: 45,
        category: EItemCategory.PIZZA,
        requiresPreparation: true,
        available: true,
      },
    ]);
  });

  it('should flag items as unavailable when an ingredient is out of stock', async () => {
    const repository = makeRepository([makeIngredient(false)], [makePizza()]);
    const useCase = new ListItemsUseCase(repository);

    const listing = await useCase.execute();

    expect(listing[0].available).toBe(false);
  });
});

describe('ListIngredientsUseCase', () => {
  it('should list ingredients with their availability', async () => {
    const repository = makeRepository([makeIngredient(false)], []);
    const useCase = new ListIngredientsUseCase(repository);

    const listing = await useCase.execute();

    expect(listing).toEqual([
      { id: INGREDIENT_ID, name: 'Mussarela', available: false },
    ]);
  });
});
