import { Inject, Injectable } from '@nestjs/common';
import { CATALOG_REPOSITORY } from '../../domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../domain/repositories/catalog-repository.js';

// Remove a menu item. The item leaves the menu listing and the kitchen
// queues; orders that already contain it keep their own copy of the item
// reference and stay readable (no FK from OrderItem to Item).
// Feature: 02_menu_and_stock.feature.
@Injectable()
export class RemoveItemUseCase {
  constructor(
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(itemId: string): Promise<void> {
    const item = await this.catalogRepository.findItemById(itemId);
    if (!item) {
      throw new Error('Item not found');
    }

    await this.catalogRepository.deleteItem(itemId);
  }
}
