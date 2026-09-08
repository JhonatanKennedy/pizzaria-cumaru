import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

export interface ILinkIngredientToItemParams {
  itemId: string;
  ingredientId: string;
}

// Make an item depend on an ingredient: while the ingredient is out of stock
// the item becomes unavailable. Linking an already-linked ingredient is a
// no-op.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class LinkIngredientToItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(params: ILinkIngredientToItemParams): Promise<void> {
    const item = await this.catalogRepository.findItemById(params.itemId);
    if (!item) {
      throw new Error('Item not found');
    }
    const ingredient = await this.catalogRepository.findIngredientById(
      params.ingredientId,
    );
    if (!ingredient) {
      throw new Error('Ingredient not found');
    }

    item.linkIngredient(params.ingredientId);
    await this.catalogRepository.saveItem(item);
  }
}
