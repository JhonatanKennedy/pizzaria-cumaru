import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

// Remove an ingredient. Its item links cascade at the database level, so the
// items that used it stay on the menu and their availability is recomputed
// from the ingredients that remain.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class RemoveIngredientUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(ingredientId: string): Promise<void> {
    const ingredient =
      await this.catalogRepository.findIngredientById(ingredientId);
    if (!ingredient) {
      throw new Error('Ingredient not found');
    }

    await this.catalogRepository.deleteIngredient(ingredientId);
  }
}
