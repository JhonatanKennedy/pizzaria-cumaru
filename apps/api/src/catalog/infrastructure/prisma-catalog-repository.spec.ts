import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../../prisma/generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaCatalogRepository } from './prisma-catalog-repository.js';

loadEnv({ path: '.env.local' });

const TEST_URL = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

function makeClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_URL }),
  });
}

describe('PrismaCatalogRepository', () => {
  let prisma: PrismaClient;
  let repository: PrismaCatalogRepository;

  beforeEach(async () => {
    prisma = makeClient();
    await prisma.itemIngredient.deleteMany();
    await prisma.item.deleteMany();
    await prisma.ingredient.deleteMany();
    repository = new PrismaCatalogRepository(prisma as never);
  });

  afterEach(async () => {
    await prisma.$disconnect();
  });

  it('should load items with their ingredient links', async () => {
    const ingredient = await prisma.ingredient.create({
      data: { name: 'Mussarela', inStock: true },
    });
    const item = await prisma.item.create({
      data: {
        name: 'Calabresa',
        description: 'Pizza de calabresa',
        price: 45,
        category: 'PIZZA',
        requiresPreparation: true,
        ingredients: { create: [{ ingredientId: ingredient.id }] },
      },
    });

    const items = await repository.findAllItems();

    expect(items).toHaveLength(1);
    expect(items[0].getId()).toBe(item.id);
    expect(items[0].getName()).toBe('Calabresa');
    expect(items[0].getRequiresPreparation()).toBe(true);
    expect(items[0].getIngredientIds()).toEqual([ingredient.id]);
  });

  it('should load ingredients with their availability', async () => {
    const available = await prisma.ingredient.create({
      data: { name: 'Mussarela', inStock: true },
    });
    await prisma.ingredient.create({
      data: { name: 'Oregano', inStock: false },
    });

    const ingredients = await repository.findAllIngredients();

    expect(ingredients).toHaveLength(2);
    const byName = new Map(
      ingredients.map((ingredient) => [ingredient.getName(), ingredient]),
    );
    expect(byName.get('Mussarela')?.isAvailable()).toBe(true);
    expect(byName.get('Oregano')?.isAvailable()).toBe(false);
    expect(byName.get('Mussarela')?.getId()).toBe(available.id);
  });

  it('should find an item by id and return null for unknown ids', async () => {
    const ingredient = await prisma.ingredient.create({
      data: { name: 'Mussarela', inStock: true },
    });
    const item = await prisma.item.create({
      data: {
        name: 'Calabresa',
        description: 'Pizza de calabresa',
        price: 45,
        category: 'PIZZA',
        requiresPreparation: true,
        ingredients: { create: [{ ingredientId: ingredient.id }] },
      },
    });

    const found = await repository.findItemById(item.id);
    const missing = await repository.findItemById('unknown-item');

    expect(found?.getName()).toBe('Calabresa');
    expect(found?.getIngredientIds()).toEqual([ingredient.id]);
    expect(missing).toBeNull();
  });

  it('should find an ingredient by id and return null for unknown ids', async () => {
    const created = await prisma.ingredient.create({
      data: { name: 'Mussarela', inStock: true },
    });

    const found = await repository.findIngredientById(created.id);
    const missing = await repository.findIngredientById('unknown');

    expect(found?.getName()).toBe('Mussarela');
    expect(missing).toBeNull();
  });

  it('should round-trip an item price change through saveItem', async () => {
    const ingredient = await prisma.ingredient.create({
      data: { name: 'Mussarela', inStock: true },
    });
    const row = await prisma.item.create({
      data: {
        name: 'Calabresa',
        description: 'Pizza de calabresa',
        price: 40,
        category: 'PIZZA',
        requiresPreparation: true,
        ingredients: { create: [{ ingredientId: ingredient.id }] },
      },
    });
    const items = await repository.findAllItems();
    const item = items[0];
    expect(item.getId()).toBe(row.id);

    item.changePrice(45);
    await repository.saveItem(item);

    const reloaded = await repository.findItemById(item.getId());
    expect(reloaded?.getPrice()).toBe(45);
  });

  it('should round-trip ingredient availability through saveIngredient', async () => {
    const row = await prisma.ingredient.create({
      data: { name: 'Mussarela', inStock: true },
    });
    const ingredients = await repository.findAllIngredients();
    const ingredient = ingredients[0];
    expect(ingredient.getId()).toBe(row.id);

    ingredient.markOutOfStock();
    await repository.saveIngredient(ingredient);

    const reloaded = await repository.findIngredientById(ingredient.getId());
    expect(reloaded?.isAvailable()).toBe(false);
  });
});
