import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

// Restore an ingredient's availability; dependent items become available again.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class MarkIngredientInStockUseCase {
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
    ingredient.markInStock();
    await this.catalogRepository.saveIngredient(ingredient);
  }
}
