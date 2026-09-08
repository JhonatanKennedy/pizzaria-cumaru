import { Inject, Injectable } from '@nestjs/common';
import { ORDERS_REPOSITORY } from '../../../orders/domain/repositories/orders-repository.js';
import { CATALOG_REPOSITORY } from '../../../catalog/domain/repositories/catalog-repository.js';
import type { IOrdersRepository } from '../../../orders/domain/repositories/orders-repository.js';
import type { ICatalogRepository } from '../../../catalog/domain/repositories/catalog-repository.js';
import { EOrderType } from '../../../orders/domain/enums/order-type.js';
import { EOrderItemStatus } from '../../../orders/domain/enums/order-item-status.js';
import type { Order } from '../../../orders/domain/entities/orders.js';
import type { OrderItems } from '../../../orders/domain/entities/order-items.js';
import type { Item } from '../../../catalog/domain/entities/items.js';

export interface IKitchenQueueItem {
  // Id of the order item this row represents - the value the kitchen's
  // start/finish endpoints act on. Distinct per line, even for repeated
  // catalog items.
  orderItemId: string;
  itemId: string;
  name: string;
  quantity: number;
  status: EOrderItemStatus;
  createdAt: Date;
}

export interface IKitchenQueueOrder {
  orderId: string;
  type: EOrderType;
  tableId?: string;
  createdAt: Date;
  items: IKitchenQueueItem[];
}

export interface IKitchenQueue {
  delivery: IKitchenQueueOrder[];
  local: IKitchenQueueOrder[];
}

const QUEUE_STATUSES = new Set([
  EOrderItemStatus.PENDING,
  EOrderItemStatus.PREPARING,
]);

// Kitchen panel: two queues (Delivery and Local), ordered by arrival.
// Only items that require preparation appear; items whose ingredients are
// out of stock are hidden.
// Features: 02_menu_and_stock.feature, 06_cook_profile.feature.
@Injectable()
export class ListKitchenQueueUseCase {
  constructor(
    @Inject(ORDERS_REPOSITORY)
    private readonly ordersRepository: IOrdersRepository,
    @Inject(CATALOG_REPOSITORY)
    private readonly catalogRepository: ICatalogRepository,
  ) {}

  async execute(): Promise<IKitchenQueue> {
    const orders = await this.ordersRepository.findAllOpen();
    const catalogItems = await this.catalogRepository.findAllItems();
    const ingredients = await this.catalogRepository.findAllIngredients();

    const itemById = new Map(catalogItems.map((item) => [item.getId(), item]));
    const ingredientAvailable = new Map(
      ingredients.map((ingredient) => [
        ingredient.getId(),
        ingredient.isAvailable(),
      ]),
    );

    const queue = (type: EOrderType): IKitchenQueueOrder[] =>
      orders
        .filter((order) => order.getType() === type)
        .map((order) => this.toQueueOrder(order, itemById, ingredientAvailable))
        .filter((queueOrder) => queueOrder.items.length > 0)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return {
      delivery: queue(EOrderType.DELIVERY),
      local: queue(EOrderType.LOCAL),
    };
  }

  private toQueueOrder(
    order: Order,
    itemById: Map<string, Item>,
    ingredientAvailable: Map<string, boolean>,
  ): IKitchenQueueOrder {
    const items = order
      .getItems()
      .filter((item) =>
        this.isVisibleInQueue(item, itemById, ingredientAvailable),
      )
      .sort((a, b) => a.getCreatedAt().getTime() - b.getCreatedAt().getTime())
      .map((item) => ({
        orderItemId: item.getId(),
        itemId: item.getItemId(),
        name: itemById.get(item.getItemId())?.getName() ?? 'Unknown item',
        quantity: item.getQuantity(),
        status: item.getStatus() as EOrderItemStatus,
        createdAt: item.getCreatedAt(),
      }));

    return {
      orderId: order.getId(),
      type: order.getType(),
      tableId: order.getTableId(),
      createdAt: order.getCreatedAt(),
      items,
    };
  }

  private isVisibleInQueue(
    item: OrderItems,
    itemById: Map<string, Item>,
    ingredientAvailable: Map<string, boolean>,
  ): boolean {
    if (!item.getRequiresPreparation()) {
      return false;
    }
    const status = item.getStatus();
    if (status === undefined || !QUEUE_STATUSES.has(status)) {
      return false;
    }
    const catalogItem = itemById.get(item.getItemId());
    if (!catalogItem) {
      return false;
    }
    return catalogItem
      .getIngredientIds()
      .every((ingredientId) => ingredientAvailable.get(ingredientId) === true);
  }
}
