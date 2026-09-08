import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';
import { EItemCategory } from '../../domain/enums/item-category.js';

export interface IItemListingEntry {
  id: string;
  name: string;
  description: string;
  price: number;
  category: EItemCategory;
  requiresPreparation: boolean;
  available: boolean;
}

// List menu items for the new-order screen, flagging items as unavailable
// when any of their ingredients is out of stock.
// Features: 02_menu_and_stock.feature, 05_waiter_profile.feature.
@Injectable()
export class ListItemsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(): Promise<IItemListingEntry[]> {
    const items = await this.catalogRepository.findAllItems();
    const ingredients = await this.catalogRepository.findAllIngredients();
    const available = new Map(
      ingredients.map((ingredient) => [
        ingredient.getId(),
        ingredient.isAvailable(),
      ]),
    );

    return items.map((item) => ({
      id: item.getId(),
      name: item.getName(),
      description: item.getDescription(),
      price: item.getPrice(),
      category: item.getCategory(),
      requiresPreparation: item.getRequiresPreparation(),
      available: item
        .getIngredientIds()
        .every((ingredientId) => available.get(ingredientId) === true),
    }));
  }
}
