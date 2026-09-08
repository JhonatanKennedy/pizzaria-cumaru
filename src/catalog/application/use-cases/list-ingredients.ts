import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

export interface IIngredientListingEntry {
  id: string;
  name: string;
  available: boolean;
}

// List ingredients with their stock state (manager screens; the cook
// profile must not have access).
// Features: 02_menu_and_stock.feature, 06_cook_profile.feature.
@Injectable()
export class ListIngredientsUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(): Promise<IIngredientListingEntry[]> {
    const ingredients = await this.catalogRepository.findAllIngredients();
    return ingredients.map((ingredient) => ({
      id: ingredient.getId(),
      name: ingredient.getName(),
      available: ingredient.isAvailable(),
    }));
  }
}
