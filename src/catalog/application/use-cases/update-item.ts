import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

export interface IUpdateItemParams {
  itemId: string;
  name?: string;
  description?: string;
}

// Rename an item and/or change its description; the new values show wherever
// the item is read (menu listing, kitchen queue, orders). The category is
// fixed at creation and has no setter here.
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class UpdateItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(params: IUpdateItemParams): Promise<void> {
    const item = await this.catalogRepository.findItemById(params.itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    if (params.name !== undefined) {
      if (!params.name.trim()) {
        throw new Error('Name is required');
      }
      const existing = await this.catalogRepository.findItemByName(params.name);
      if (existing && existing.getId() !== item.getId()) {
        throw new Error('Item name already in use');
      }
      item.rename(params.name);
    }
    if (params.description !== undefined) {
      if (!params.description.trim()) {
        throw new Error('Description is required');
      }
      item.changeDescription(params.description);
    }

    await this.catalogRepository.saveItem(item);
  }
}
