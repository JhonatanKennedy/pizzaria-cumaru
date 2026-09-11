import { PrismaCatalogRepository } from './prisma-catalog-repository.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../prisma/generated/client.js';
import { Item } from '../domain/entities/items.js';
import { Ingredient } from '../domain/entities/ingredients.js';
import { EItemCategory } from '../domain/enums/item-category.js';

// This adapter's contract has two halves: what it makes of the rows Prisma
// hands back, and what it asks Prisma for. Both are checked here against a
// double, so the suite says exactly what the adapter promises and no more —
// whether Postgres honours the `where` is Prisma's to get right, and the e2e
// suite is where a real database still has a say.

const ITEM_ID = 'item-1';
const INGREDIENT_ID = 'ingredient-1';
const PIZZA_PRICE = 45;

type TItemRow = Prisma.ItemGetPayload<{
  include: { ingredients: { include: { ingredient: true } } };
}>;
type TIngredientRow = Prisma.IngredientGetPayload<Record<string, never>>;

function makeLinkRow(ingredientId = INGREDIENT_ID) {
  return {
    itemId: ITEM_ID,
    ingredientId,
    ingredient: {
      id: ingredientId,
      name: 'Mussarela',
      inStock: true,
    },
  };
}

function makeItemRow(overrides: Partial<TItemRow> = {}): TItemRow {
  return {
    id: ITEM_ID,
    name: 'Calabresa',
    description: 'Pizza de calabresa',
    price: PIZZA_PRICE,
    category: EItemCategory.PIZZA,
    requiresPreparation: true,
    ingredients: [makeLinkRow()],
    ...overrides,
  };
}

function makeIngredientRow(
  overrides: Partial<TIngredientRow> = {},
): TIngredientRow {
  return {
    id: INGREDIENT_ID,
    name: 'Mussarela',
    inStock: true,
    ...overrides,
  };
}

const ITEM_WITH_INGREDIENTS = {
  ingredients: { include: { ingredient: true } },
};

function makePrismaDouble() {
  return {
    item: {
      findUnique: vi.fn(
        async (_args: Prisma.ItemFindUniqueArgs): Promise<TItemRow | null> =>
          null,
      ),
      findFirst: vi.fn(
        async (_args: Prisma.ItemFindFirstArgs): Promise<TItemRow | null> =>
          null,
      ),
      findMany: vi.fn(
        async (_args: Prisma.ItemFindManyArgs): Promise<TItemRow[]> => [],
      ),
      upsert: vi.fn(
        async (_args: Prisma.ItemUpsertArgs): Promise<void> => undefined,
      ),
      delete: vi.fn(
        async (_args: Prisma.ItemDeleteArgs): Promise<void> => undefined,
      ),
    },
    ingredient: {
      findUnique: vi.fn(
        async (
          _args: Prisma.IngredientFindUniqueArgs,
        ): Promise<TIngredientRow | null> => null,
      ),
      findFirst: vi.fn(
        async (
          _args: Prisma.IngredientFindFirstArgs,
        ): Promise<TIngredientRow | null> => null,
      ),
      findMany: vi.fn(
        async (
          _args: Prisma.IngredientFindManyArgs,
        ): Promise<TIngredientRow[]> => [],
      ),
      upsert: vi.fn(
        async (_args: Prisma.IngredientUpsertArgs): Promise<void> => undefined,
      ),
      delete: vi.fn(
        async (_args: Prisma.IngredientDeleteArgs): Promise<void> => undefined,
      ),
    },
  };
}

type TPrismaDouble = ReturnType<typeof makePrismaDouble>;

function makeRepository(double: TPrismaDouble): PrismaCatalogRepository {
  return new PrismaCatalogRepository(double as unknown as PrismaService);
}

describe('PrismaCatalogRepository', () => {
  it('should load items with their ingredient links', async () => {
    const double = makePrismaDouble();
    double.item.findMany.mockResolvedValue([
      makeItemRow(),
      makeItemRow({
        id: 'item-2',
        ingredients: [makeLinkRow('ingredient-2'), makeLinkRow('ingredient-3')],
      }),
    ]);
    const repository = makeRepository(double);

    const items = await repository.findAllItems();

    expect(double.item.findMany).toHaveBeenCalledWith({
      include: ITEM_WITH_INGREDIENTS,
    });
    expect(items).toHaveLength(2);
    expect(items[0].getId()).toBe(ITEM_ID);
    expect(items[0].getName()).toBe('Calabresa');
    expect(items[0].getRequiresPreparation()).toBe(true);
    expect(items[0].getIngredientIds()).toEqual([INGREDIENT_ID]);
    expect(items[1].getIngredientIds()).toEqual([
      'ingredient-2',
      'ingredient-3',
    ]);
  });

  it('should load ingredients with their availability', async () => {
    const double = makePrismaDouble();
    double.ingredient.findMany.mockResolvedValue([
      makeIngredientRow(),
      makeIngredientRow({
        id: 'ingredient-2',
        name: 'Oregano',
        inStock: false,
      }),
    ]);
    const repository = makeRepository(double);

    const ingredients = await repository.findAllIngredients();

    expect(ingredients).toHaveLength(2);
    const byName = new Map(
      ingredients.map((ingredient) => [ingredient.getName(), ingredient]),
    );
    expect(byName.get('Mussarela')?.isAvailable()).toBe(true);
    expect(byName.get('Oregano')?.isAvailable()).toBe(false);
    expect(byName.get('Mussarela')?.getId()).toBe(INGREDIENT_ID);
  });

  it('should find an item by id and return null for unknown ids', async () => {
    const double = makePrismaDouble();
    double.item.findUnique.mockResolvedValue(makeItemRow());
    const repository = makeRepository(double);

    const found = await repository.findItemById(ITEM_ID);

    expect(double.item.findUnique).toHaveBeenCalledWith({
      where: { id: ITEM_ID },
      include: ITEM_WITH_INGREDIENTS,
    });
    expect(found?.getName()).toBe('Calabresa');
    expect(found?.getIngredientIds()).toEqual([INGREDIENT_ID]);

    double.item.findUnique.mockResolvedValue(null);
    expect(await repository.findItemById('unknown-item')).toBeNull();
  });

  it('should find an ingredient by id and return null for unknown ids', async () => {
    const double = makePrismaDouble();
    double.ingredient.findUnique.mockResolvedValue(makeIngredientRow());
    const repository = makeRepository(double);

    const found = await repository.findIngredientById(INGREDIENT_ID);

    expect(double.ingredient.findUnique).toHaveBeenCalledWith({
      where: { id: INGREDIENT_ID },
    });
    expect(found?.getName()).toBe('Mussarela');

    double.ingredient.findUnique.mockResolvedValue(null);
    expect(await repository.findIngredientById('unknown')).toBeNull();
  });

  it('should refuse an item row carrying an unknown category', async () => {
    const double = makePrismaDouble();
    double.item.findMany.mockResolvedValue([
      makeItemRow({ category: 'Sushi' }),
    ]);
    const repository = makeRepository(double);

    await expect(repository.findAllItems()).rejects.toThrow(
      'Unknown item category: Sushi',
    );
  });

  it('should save an item price change on both the update and the create path', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);
    const item = Item.create({
      id: ITEM_ID,
      name: 'Calabresa',
      description: 'Pizza de calabresa',
      price: PIZZA_PRICE,
      category: EItemCategory.PIZZA,
      requiresPreparation: true,
      ingredientIds: [INGREDIENT_ID],
    });

    await repository.saveItem(item);

    expect(double.item.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ITEM_ID },
        update: expect.objectContaining({
          price: PIZZA_PRICE,
          ingredients: {
            deleteMany: {},
            create: [{ ingredientId: INGREDIENT_ID }],
          },
        }),
        create: expect.objectContaining({
          id: ITEM_ID,
          price: PIZZA_PRICE,
          ingredients: { create: [{ ingredientId: INGREDIENT_ID }] },
        }),
      }),
    );
  });

  it('should save ingredient availability on both the update and the create path', async () => {
    const double = makePrismaDouble();
    const repository = makeRepository(double);
    const ingredient = Ingredient.create({
      id: INGREDIENT_ID,
      name: 'Mussarela',
      inStock: true,
    });
    ingredient.markOutOfStock();

    await repository.saveIngredient(ingredient);

    expect(double.ingredient.upsert).toHaveBeenCalledWith({
      where: { id: INGREDIENT_ID },
      update: { name: 'Mussarela', inStock: false },
      create: { id: INGREDIENT_ID, name: 'Mussarela', inStock: false },
    });
  });
});
