import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

export interface IUpdateItemPriceParams {
  itemId: string;
  price: number;
}

// Change an item's price; new orders use the new price.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class UpdateItemPriceUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(params: IUpdateItemPriceParams): Promise<void> {
    const item = await this.catalogRepository.findItemById(params.itemId);
    if (!item) {
      throw new Error('Item not found');
    }
    item.changePrice(params.price);
    await this.catalogRepository.saveItem(item);
  }
}
