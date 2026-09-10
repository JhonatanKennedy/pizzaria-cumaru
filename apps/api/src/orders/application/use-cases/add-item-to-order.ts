import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ORDERS_REPOSITORY } from '../../domain/repositories/orders-repository.js';
import type { IOrdersRepository } from '../../domain/repositories/orders-repository.js';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/repositories/catalog-repository.js';
import type { ICatalogRepository } from '../../../catalog/domain/repositories/catalog-repository.js';
import type { Item } from '../../../catalog/domain/entities/items.js';
import { EItemCategory } from '../../../catalog/domain/enums/item-category.js';
import {
  PIZZA_SIZE_CANVAS,
  pizzaSizeOf,
  sizeCanvasOf,
} from '../../../catalog/domain/sizes.js';
import { OrderItems } from '../../domain/entities/order-items.js';
import type { TFlavorPart } from '../../domain/entities/order-items.js';

export interface IAddItemToOrderParams {
  orderId: string;
  itemId: string;
  quantity?: number;
  parts?: TFlavorPart[];
  notes?: string;
}

// Add an item to an open order, with an optional parts composition
// (split pizza) and observations.
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

    const parts = await this.resolveParts(catalogItem, params.parts);
    const unitPrice = await this.resolveUnitPrice(catalogItem, parts);

    order.addItem(
      OrderItems.create({
        id: randomUUID(),
        orderId: order.getId(),
        itemId: params.itemId,
        unitPrice,
        quantity: params.quantity ?? 1,
        requiresPreparation: catalogItem.getRequiresPreparation(),
        createdAt: new Date(),
        parts,
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

  // Resolves the composition to record. Without parts, a pizza records its
  // whole canvas as a single part (token-less names default to the historic
  // 8 fatias) and any other item records none. With parts, the entries are
  // judged in the spec's order: registered pizzas first, then the base's
  // size token, then positive pieces summing to the canvas, then every
  // flavor's availability.
  private async resolveParts(
    catalogItem: Item,
    requested?: TFlavorPart[],
  ): Promise<TFlavorPart[]> {
    const canvas = sizeCanvasOf(catalogItem.getName());
    if (!requested || requested.length === 0) {
      if (catalogItem.getCategory() !== EItemCategory.PIZZA) {
        return [];
      }
      return [
        {
          name: catalogItem.getName(),
          pieces: canvas ?? PIZZA_SIZE_CANVAS.G,
        },
      ];
    }

    if (
      catalogItem.getCategory() !== EItemCategory.PIZZA ||
      canvas === null
    ) {
      // Only a sized pizza has a canvas for flavors to cover; an item
      // without one cannot be composed.
      throw new Error('Flavor must match the pizza size');
    }

    const resolved: Item[] = [];
    for (const part of requested) {
      const partItem = await this.catalogRepository.findItemByName(
        part.name,
      );
      if (!partItem || partItem.getCategory() !== EItemCategory.PIZZA) {
        throw new Error('Flavor is not a registered pizza');
      }
      resolved.push(partItem);
    }

    const baseSize = pizzaSizeOf(catalogItem.getName());
    for (const partItem of resolved) {
      if (pizzaSizeOf(partItem.getName()) !== baseSize) {
        throw new Error('Flavor must match the pizza size');
      }
    }

    for (const part of requested) {
      if (!Number.isInteger(part.pieces) || part.pieces < 1) {
        throw new Error('Flavor pieces must sum to the pizza size');
      }
    }
    const total = requested.reduce((sum, part) => sum + part.pieces, 0);
    if (total !== canvas) {
      throw new Error('Flavor pieces must sum to the pizza size');
    }

    for (const partItem of resolved) {
      await this.assertAvailable(partItem);
    }
    return requested.map(({ name, pieces }) => ({ name, pieces }));
  }

  private async resolveUnitPrice(
    catalogItem: Item,
    parts: TFlavorPart[],
  ): Promise<number> {
    const prices = [catalogItem.getPrice()];
    for (const part of parts) {
      if (part.name === catalogItem.getName()) {
        continue;
      }
      const flavorItem = await this.catalogRepository.findItemByName(
        part.name,
      );
      if (flavorItem) {
        prices.push(flavorItem.getPrice());
      }
    }
    return Math.max(...prices);
  }
}
