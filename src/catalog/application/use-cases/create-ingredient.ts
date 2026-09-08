import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';
import { Ingredient } from '../../domain/entities/ingredients.js';

export interface ICreateIngredientParams {
  name: string;
}

// Register an ingredient, available by default. New ingredients appear in the
// ingredient listing immediately. Duplicate names are refused.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class CreateIngredientUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(params: ICreateIngredientParams): Promise<void> {
    const existing = await this.catalogRepository.findIngredientByName(
      params.name,
    );
    if (existing) {
      throw new Error('Ingredient name already in use');
    }

    const ingredient = Ingredient.create({
      id: randomUUID(),
      name: params.name,
      inStock: true,
    });
    await this.catalogRepository.saveIngredient(ingredient);
  }
}
