import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../../catalog/domain/repositories/catalog-repository.js';
import type { Item } from '../../../catalog/domain/entities/items.js';
import { OrderItems } from '../../domain/entities/order-items.js';

export interface IAddItemToOrderParams {
  orderId: string;
  itemId: string;
  quantity?: number;
  flavors?: string[];
  notes?: string;
}

// Add an item to an open order, with optional flavors (split pizza) and observations.
// Closed orders reject new items (see Order.addItem).
// Features: 03_table_order.feature, 04_delivery_order.feature.
@Injectable()
export class AddItemToOrderUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(params: IAddItemToOrderParams): Promise<void> {
    const order = await this.ordersRepository.findById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const catalogItem = await this.catalogRepository.findItemById(
      params.itemId,
    );
    if (!catalogItem) {
      throw new Error('Item not found');
    }

    if (catalogItem.getRequiresPreparation()) {
      await this.assertAvailable(catalogItem);
    }

    const flavors = params.flavors ?? [catalogItem.getName()];
    const unitPrice = await this.resolveUnitPrice(catalogItem, flavors);

    order.addItem(
      OrderItems.create({
        id: randomUUID(),
        orderId: order.getId(),
        itemId: params.itemId,
        unitPrice,
        quantity: params.quantity ?? 1,
        requiresPreparation: catalogItem.getRequiresPreparation(),
        createdAt: new Date(),
        flavors,
        notes: params.notes,
      }),
    );
    await this.ordersRepository.save(order);
  }

  private async assertAvailable(catalogItem: Item): Promise<void> {
    const ingredients = await this.catalogRepository.findAllIngredients();
    const available = new Map(
      ingredients.map((ingredient) => [
        ingredient.getId(),
        ingredient.isAvailable(),
      ]),
    );
    const allAvailable = catalogItem
      .getIngredientIds()
      .every((ingredientId) => available.get(ingredientId) === true);
    if (!allAvailable) {
      throw new Error('Item is unavailable');
    }
  }

  private async resolveUnitPrice(
    catalogItem: Item,
    flavors: string[],
  ): Promise<number> {
    const prices = [catalogItem.getPrice()];
    for (const flavor of flavors) {
      if (flavor === catalogItem.getName()) {
        continue;
      }
      const flavorItem = await this.catalogRepository.findItemByName(flavor);
      if (flavorItem) {
        prices.push(flavorItem.getPrice());
      }
    }
    return Math.max(...prices);
  }
}
