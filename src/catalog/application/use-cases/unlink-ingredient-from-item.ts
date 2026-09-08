import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

export interface IUnlinkIngredientFromItemParams {
  itemId: string;
  ingredientId: string;
}

// Release an item from an ingredient's stock: the item stops depending on it
// and stays available even when the ingredient is out of stock. Unlinking an
// ingredient the item does not use is a no-op.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class UnlinkIngredientFromItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(params: IUnlinkIngredientFromItemParams): Promise<void> {
    const item = await this.catalogRepository.findItemById(params.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    item.unlinkIngredient(params.ingredientId);
    await this.catalogRepository.saveItem(item);
  }
}
