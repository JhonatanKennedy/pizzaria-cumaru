import { MarkIngredientOutOfStockUseCase } from './mark-ingredient-out-of-stock.js';
import { MarkIngredientInStockUseCase } from './mark-ingredient-in-stock.js';
import { UpdateItemPriceUseCase } from './update-item-price.js';
import { ListItemsUseCase } from './list-items.js';
import { ListIngredientsUseCase } from './list-ingredients.js';
import { CreateItemUseCase } from './create-item.js';
import { UpdateItemUseCase } from './update-item.js';
import { RemoveItemUseCase } from './remove-item.js';
import { LinkIngredientToItemUseCase } from './link-ingredient-to-item.js';
import { UnlinkIngredientFromItemUseCase } from './unlink-ingredient-from-item.js';
import { CreateIngredientUseCase } from './create-ingredient.js';
import { RenameIngredientUseCase } from './rename-ingredient.js';
import { RemoveIngredientUseCase } from './remove-ingredient.js';
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
  findItemByName: Item | null = null,
  findIngredientByName: Ingredient | null = null,
) {
  return {
    findAllItems: vi.fn(async () => items),
    findAllIngredients: vi.fn(async () => ingredients),
    findItemById: vi.fn(async () => findItem),
    findItemByName: vi.fn(async () => findItemByName),
    findIngredientById: vi.fn(async () => findIngredient),
    findIngredientByName: vi.fn(async () => findIngredientByName),
    saveItem: vi.fn(async () => undefined),
    saveIngredient: vi.fn(async () => undefined),
    deleteItem: vi.fn(async () => undefined),
    deleteIngredient: vi.fn(async () => undefined),
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

describe('CreateItemUseCase', () => {
  it('should create an item with a generated id and persist it', async () => {
    const ingredient = makeIngredient(true);
    const repository = makeRepository([ingredient], [], ingredient);
    const useCase = new CreateItemUseCase(repository);

    await useCase.execute({
      name: 'Calabresa Especial',
      description: 'Calabresa com catupiry',
      price: 55,
      category: EItemCategory.PIZZA,
      requiresPreparation: true,
      ingredientIds: [INGREDIENT_ID],
    });

    const saved = vi.mocked(repository.saveItem).mock.calls[0][0] as Item;
    expect(saved.getId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.getName()).toBe('Calabresa Especial');
    expect(saved.getIngredientIds()).toEqual([INGREDIENT_ID]);
    expect(repository.findIngredientById).toHaveBeenCalledWith(INGREDIENT_ID);
  });

  it('should refuse a blank description', async () => {
    const repository = makeRepository([], []);
    const useCase = new CreateItemUseCase(repository);

    await expect(
      useCase.execute({
        name: 'Calabresa',
        description: '   ',
        price: 45,
        category: EItemCategory.PIZZA,
        requiresPreparation: true,
      }),
    ).rejects.toThrow('Description is required');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });

  it('should refuse an unknown category', async () => {
    const repository = makeRepository([], []);
    const useCase = new CreateItemUseCase(repository);

    await expect(
      useCase.execute({
        name: 'Sanduíche',
        description: 'Um lanche',
        price: 20,
        category: 'SANDWICH' as EItemCategory,
        requiresPreparation: false,
      }),
    ).rejects.toThrow('Unknown item category: SANDWICH');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });

  it('should refuse a duplicate item name', async () => {
    const repository = makeRepository([], [], null, null, makePizza());
    const useCase = new CreateItemUseCase(repository);

    await expect(
      useCase.execute({
        name: 'Calabresa',
        description: 'Pizza de calabresa',
        price: 45,
        category: EItemCategory.PIZZA,
        requiresPreparation: true,
      }),
    ).rejects.toThrow('Item name already in use');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });

  it('should refuse an unknown ingredient id', async () => {
    const repository = makeRepository([], [], null);
    const useCase = new CreateItemUseCase(repository);

    await expect(
      useCase.execute({
        name: 'Calabresa Especial',
        description: 'Calabresa com catupiry',
        price: 55,
        category: EItemCategory.PIZZA,
        requiresPreparation: true,
        ingredientIds: ['unknown-ingredient'],
      }),
    ).rejects.toThrow('Ingredient not found');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });
});

describe('UpdateItemUseCase', () => {
  it('should rename an item and persist it', async () => {
    const item = makePizza();
    const repository = makeRepository([], [], null, item);
    const useCase = new UpdateItemUseCase(repository);

    await useCase.execute({
      itemId: ITEM_ID,
      name: 'Calabresa Reforçada',
    });

    expect(item.getName()).toBe('Calabresa Reforçada');
    expect(item.getDescription()).toBe('Pizza de calabresa');
    expect(repository.saveItem).toHaveBeenCalledWith(item);
  });

  it('should change the description without touching the name', async () => {
    const item = makePizza();
    const repository = makeRepository([], [], null, item);
    const useCase = new UpdateItemUseCase(repository);

    await useCase.execute({
      itemId: ITEM_ID,
      description: 'Calabresa com borda recheada',
    });

    expect(item.getName()).toBe('Calabresa');
    expect(item.getDescription()).toBe('Calabresa com borda recheada');
    expect(repository.saveItem).toHaveBeenCalledWith(item);
  });

  it('should refuse an unknown item', async () => {
    const repository = makeRepository([], [], null, null);
    const useCase = new UpdateItemUseCase(repository);

    await expect(
      useCase.execute({ itemId: 'unknown', name: 'X' }),
    ).rejects.toThrow('Item not found');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });

  it('should refuse renaming to a name used by another item', async () => {
    const item = makePizza();
    const other = Item.create({
      id: 'item-2',
      name: 'Mussarela',
      description: 'Pizza de mussarela',
      price: 45,
      category: EItemCategory.PIZZA,
      requiresPreparation: true,
    });
    const repository = makeRepository([], [], null, item, other);
    const useCase = new UpdateItemUseCase(repository);

    await expect(
      useCase.execute({ itemId: ITEM_ID, name: 'Mussarela' }),
    ).rejects.toThrow('Item name already in use');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });

  it('should allow keeping the current name', async () => {
    const item = makePizza();
    const repository = makeRepository([], [], null, item, item);
    const useCase = new UpdateItemUseCase(repository);

    await useCase.execute({ itemId: ITEM_ID, name: 'Calabresa' });

    expect(item.getName()).toBe('Calabresa');
    expect(repository.saveItem).toHaveBeenCalledWith(item);
  });

  it('should refuse a blank description', async () => {
    const item = makePizza();
    const repository = makeRepository([], [], null, item);
    const useCase = new UpdateItemUseCase(repository);

    await expect(
      useCase.execute({ itemId: ITEM_ID, description: '  ' }),
    ).rejects.toThrow('Description is required');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });
});

describe('RemoveItemUseCase', () => {
  it('should remove an existing item', async () => {
    const repository = makeRepository([], [], null, makePizza());
    const useCase = new RemoveItemUseCase(repository);

    await useCase.execute(ITEM_ID);

    expect(repository.deleteItem).toHaveBeenCalledWith(ITEM_ID);
  });

  it('should refuse an unknown item', async () => {
    const repository = makeRepository([], [], null, null);
    const useCase = new RemoveItemUseCase(repository);

    await expect(useCase.execute('unknown')).rejects.toThrow('Item not found');
    expect(repository.deleteItem).not.toHaveBeenCalled();
  });
});

describe('LinkIngredientToItemUseCase', () => {
  it('should add the ingredient link and persist the item', async () => {
    const item = makePizza([]);
    const ingredient = makeIngredient(true);
    const repository = makeRepository([], [], ingredient, item);
    const useCase = new LinkIngredientToItemUseCase(repository);

    await useCase.execute({ itemId: ITEM_ID, ingredientId: INGREDIENT_ID });

    expect(item.getIngredientIds()).toEqual([INGREDIENT_ID]);
    expect(repository.saveItem).toHaveBeenCalledWith(item);
  });

  it('should refuse an unknown item', async () => {
    const repository = makeRepository([], [], makeIngredient(true), null);
    const useCase = new LinkIngredientToItemUseCase(repository);

    await expect(
      useCase.execute({ itemId: 'unknown', ingredientId: INGREDIENT_ID }),
    ).rejects.toThrow('Item not found');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });

  it('should refuse an unknown ingredient', async () => {
    const repository = makeRepository([], [], null, makePizza());
    const useCase = new LinkIngredientToItemUseCase(repository);

    await expect(
      useCase.execute({ itemId: ITEM_ID, ingredientId: 'unknown' }),
    ).rejects.toThrow('Ingredient not found');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });
});

describe('UnlinkIngredientFromItemUseCase', () => {
  it('should remove the ingredient link and persist the item', async () => {
    const item = makePizza([INGREDIENT_ID]);
    const repository = makeRepository([], [], null, item);
    const useCase = new UnlinkIngredientFromItemUseCase(repository);

    await useCase.execute({ itemId: ITEM_ID, ingredientId: INGREDIENT_ID });

    expect(item.getIngredientIds()).toEqual([]);
    expect(repository.saveItem).toHaveBeenCalledWith(item);
  });

  it('should refuse an unknown item', async () => {
    const repository = makeRepository([], [], null, null);
    const useCase = new UnlinkIngredientFromItemUseCase(repository);

    await expect(
      useCase.execute({ itemId: 'unknown', ingredientId: INGREDIENT_ID }),
    ).rejects.toThrow('Item not found');
    expect(repository.saveItem).not.toHaveBeenCalled();
  });
});

describe('CreateIngredientUseCase', () => {
  it('should create an available ingredient with a generated id and persist it', async () => {
    const repository = makeRepository([], []);
    const useCase = new CreateIngredientUseCase(repository);

    await useCase.execute({ name: 'Catupiry' });

    const saved = vi.mocked(repository.saveIngredient).mock
      .calls[0][0] as Ingredient;
    expect(saved.getId()).toMatch(/^[0-9a-f-]{36}$/);
    expect(saved.getName()).toBe('Catupiry');
    expect(saved.isAvailable()).toBe(true);
  });

  it('should refuse a duplicate ingredient name', async () => {
    const repository = makeRepository(
      [],
      [],
      null,
      null,
      null,
      makeIngredient(true),
    );
    const useCase = new CreateIngredientUseCase(repository);

    await expect(useCase.execute({ name: 'Mussarela' })).rejects.toThrow(
      'Ingredient name already in use',
    );
    expect(repository.saveIngredient).not.toHaveBeenCalled();
  });

  it('should refuse a blank name', async () => {
    const repository = makeRepository([], []);
    const useCase = new CreateIngredientUseCase(repository);

    await expect(useCase.execute({ name: '  ' })).rejects.toThrow(
      'Name is required',
    );
    expect(repository.saveIngredient).not.toHaveBeenCalled();
  });
});

describe('RenameIngredientUseCase', () => {
  it('should rename the ingredient and persist it', async () => {
    const ingredient = makeIngredient(true);
    const repository = makeRepository([], [], ingredient);
    const useCase = new RenameIngredientUseCase(repository);

    await useCase.execute({ ingredientId: INGREDIENT_ID, name: 'Muçarela' });

    expect(ingredient.getName()).toBe('Muçarela');
    expect(repository.saveIngredient).toHaveBeenCalledWith(ingredient);
  });

  it('should refuse an unknown ingredient', async () => {
    const repository = makeRepository([], [], null);
    const useCase = new RenameIngredientUseCase(repository);

    await expect(
      useCase.execute({ ingredientId: 'unknown', name: 'Muçarela' }),
    ).rejects.toThrow('Ingredient not found');
    expect(repository.saveIngredient).not.toHaveBeenCalled();
  });

  it('should refuse renaming to a name used by another ingredient', async () => {
    const ingredient = makeIngredient(true);
    const other = Ingredient.create({
      id: 'ingredient-2',
      name: 'Oregano',
      inStock: true,
    });
    const repository = makeRepository([], [], ingredient, null, null, other);
    const useCase = new RenameIngredientUseCase(repository);

    await expect(
      useCase.execute({ ingredientId: INGREDIENT_ID, name: 'Oregano' }),
    ).rejects.toThrow('Ingredient name already in use');
    expect(repository.saveIngredient).not.toHaveBeenCalled();
  });

  it('should allow keeping the current name', async () => {
    const ingredient = makeIngredient(true);
    const repository = makeRepository(
      [],
      [],
      ingredient,
      null,
      null,
      ingredient,
    );
    const useCase = new RenameIngredientUseCase(repository);

    await useCase.execute({ ingredientId: INGREDIENT_ID, name: 'Mussarela' });

    expect(ingredient.getName()).toBe('Mussarela');
    expect(repository.saveIngredient).toHaveBeenCalledWith(ingredient);
  });
});

describe('RemoveIngredientUseCase', () => {
  it('should remove an existing ingredient', async () => {
    const repository = makeRepository([], [], makeIngredient(true));
    const useCase = new RemoveIngredientUseCase(repository);

    await useCase.execute(INGREDIENT_ID);

    expect(repository.deleteIngredient).toHaveBeenCalledWith(INGREDIENT_ID);
  });

  it('should refuse an unknown ingredient', async () => {
    const repository = makeRepository([], [], null);
    const useCase = new RemoveIngredientUseCase(repository);

    await expect(useCase.execute('unknown')).rejects.toThrow(
      'Ingredient not found',
    );
    expect(repository.deleteIngredient).not.toHaveBeenCalled();
  });
});
