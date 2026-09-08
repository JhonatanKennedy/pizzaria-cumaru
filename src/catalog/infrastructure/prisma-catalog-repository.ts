import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ICatalogRepository } from '../domain/repositories/catalog-repository.js';
import { Item } from '../domain/entities/items.js';
import { Ingredient } from '../domain/entities/ingredients.js';
import { EItemCategory } from '../domain/enums/item-category.js';

const ITEM_CATEGORIES = new Set<string>(Object.values(EItemCategory));
const ITEM_WITH_INGREDIENTS = {
  ingredients: { include: { ingredient: true } },
} as const;

function parseItemCategory(value: string): EItemCategory {
  if (!ITEM_CATEGORIES.has(value)) {
    throw new Error(`Unknown item category: ${value}`);
  }
  return value as EItemCategory;
}

@Injectable()
export class PrismaCatalogRepository implements ICatalogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllItems(): Promise<Item[]> {
    const rows = await this.prisma.item.findMany({
      include: ITEM_WITH_INGREDIENTS,
    });
    return rows.map((row) =>
      Item.create({
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        category: parseItemCategory(row.category),
        requiresPreparation: row.requiresPreparation,
        ingredientIds: row.ingredients.map((link) => link.ingredient.id),
      }),
    );
  }

  async findAllIngredients(): Promise<Ingredient[]> {
    const rows = await this.prisma.ingredient.findMany();
    return rows.map((row) =>
      Ingredient.create({ id: row.id, name: row.name, inStock: row.inStock }),
    );
  }

  async findItemById(id: string): Promise<Item | null> {
    const row = await this.prisma.item.findUnique({
      where: { id },
      include: ITEM_WITH_INGREDIENTS,
    });
    if (!row) {
      return null;
    }
    return Item.create({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      category: parseItemCategory(row.category),
      requiresPreparation: row.requiresPreparation,
      ingredientIds: row.ingredients.map((link) => link.ingredient.id),
    });
  }

  async findItemByName(name: string): Promise<Item | null> {
    const row = await this.prisma.item.findFirst({
      where: { name },
      include: ITEM_WITH_INGREDIENTS,
    });
    if (!row) {
      return null;
    }
    return Item.create({
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      category: parseItemCategory(row.category),
      requiresPreparation: row.requiresPreparation,
      ingredientIds: row.ingredients.map((link) => link.ingredient.id),
    });
  }
  async findIngredientById(id: string): Promise<Ingredient | null> {
    const row = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!row) {
      return null;
    }
    return Ingredient.create({
      id: row.id,
      name: row.name,
      inStock: row.inStock,
    });
  }

  async saveItem(item: Item): Promise<void> {
    await this.prisma.item.update({
      where: { id: item.getId() },
      data: {
        name: item.getName(),
        description: item.getDescription(),
        price: item.getPrice(),
        category: item.getCategory(),
        requiresPreparation: item.getRequiresPreparation(),
        ingredients: {
          deleteMany: {},
          create: item
            .getIngredientIds()
            .map((ingredientId) => ({ ingredientId })),
        },
      },
    });
  }

  async saveIngredient(ingredient: Ingredient): Promise<void> {
    await this.prisma.ingredient.update({
      where: { id: ingredient.getId() },
      data: { name: ingredient.getName(), inStock: ingredient.isAvailable() },
    });
  }
}
