import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

// Mark an ingredient unavailable; every item depending on it becomes
// unavailable and leaves the kitchen queue.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class MarkIngredientOutOfStockUseCase {
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
    ingredient.markOutOfStock();
    await this.catalogRepository.saveIngredient(ingredient);
  }
}
