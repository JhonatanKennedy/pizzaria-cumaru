import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

export interface IRenameIngredientParams {
  ingredientId: string;
  name: string;
}

// Rename an ingredient. The new name shows in the ingredient listing; items
// that depend on it keep their availability.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class RenameIngredientUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(params: IRenameIngredientParams): Promise<void> {
    const ingredient = await this.catalogRepository.findIngredientById(
      params.ingredientId,
    );
    if (!ingredient) {
      throw new Error('Ingredient not found');
    }

    const existing = await this.catalogRepository.findIngredientByName(
      params.name,
    );
    if (existing && existing.getId() !== ingredient.getId()) {
      throw new Error('Ingredient name already in use');
    }

    ingredient.rename(params.name);
    await this.catalogRepository.saveIngredient(ingredient);
  }
}
