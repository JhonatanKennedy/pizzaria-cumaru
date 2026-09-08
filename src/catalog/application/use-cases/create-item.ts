import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';
import { Item } from '../../domain/entities/items.js';
import { EItemCategory } from '../../domain/enums/item-category.js';

export interface ICreateItemParams {
  name: string;
  description: string;
  price: number;
  category: EItemCategory;
  requiresPreparation: boolean;
  ingredientIds?: string[];
}

const ITEM_CATEGORIES = new Set<string>(Object.values(EItemCategory));

// Register a menu item with its initial ingredient links. New items appear in
// the menu listing immediately; availability follows the linked ingredients'
// stock. Duplicate names are refused.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class CreateItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(params: ICreateItemParams): Promise<void> {
    if (!params.description.trim()) {
      throw new Error('Description is required');
    }
    if (!ITEM_CATEGORIES.has(params.category)) {
      throw new Error(`Unknown item category: ${params.category}`);
    }
    const existing = await this.catalogRepository.findItemByName(params.name);
    if (existing) {
      throw new Error('Item name already in use');
    }
    for (const ingredientId of params.ingredientIds ?? []) {
      const ingredient =
        await this.catalogRepository.findIngredientById(ingredientId);
      if (!ingredient) {
        throw new Error('Ingredient not found');
      }
    }

    const item = Item.create({
      id: randomUUID(),
      name: params.name,
      description: params.description,
      price: params.price,
      category: params.category,
      requiresPreparation: params.requiresPreparation,
      ingredientIds: params.ingredientIds,
    });
    await this.catalogRepository.saveItem(item);
  }
}
